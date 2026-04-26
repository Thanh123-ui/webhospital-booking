const db = require('../data/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { writeLog } = require('../utils/logger');
const { jwtSecret, jwtRefreshSecret } = require('../config/env');
const { AppError, sendSuccess, toAppError } = require('../utils/http');
const emailService = require('../utils/email');
const env = require('../config/env');

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const patientPasswordResetStore = new Map();

const generateTokens = (userPayload) => {
    const accessToken = jwt.sign(userPayload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(userPayload, jwtRefreshSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

const normalizePhone = (phone) => String(phone || '').replace(/\s+/g, '').trim();
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

exports.patientLogin = async (req, res, next) => {
    try {
        const { phone, password } = req.body;

        const patient = await db.findPatientByPhone(phone);
        
        if (patient) {
            const isMatch = await bcrypt.compare(password, patient.password);
            if (isMatch) {
                const tokens = generateTokens({ id: patient.id, role: 'PATIENT' });
                const { password: _, ...patientWithoutPassword } = patient;
                return sendSuccess(res, { user: patientWithoutPassword, ...tokens }, 'Đăng nhập thành công.');
            }
        }
        
        return next(new AppError('Số điện thoại hoặc mật khẩu không đúng!', 401));
    } catch (err) {
        next(toAppError(err));
    }
};

exports.requestPatientPasswordResetOtp = async (req, res, next) => {
    try {
        const phone = normalizePhone(req.body.phone);
        const patient = await db.findPatientByPhone(phone);

        if (!patient) {
            return next(new AppError('Không tìm thấy hồ sơ bệnh nhân với số điện thoại này.', 404));
        }

        const now = Date.now();
        const currentEntry = patientPasswordResetStore.get(phone);
        if (currentEntry && now - currentEntry.requestedAt < OTP_RESEND_MS) {
            const retryAfter = Math.ceil((OTP_RESEND_MS - (now - currentEntry.requestedAt)) / 1000);
            return next(new AppError(`Vui lòng chờ ${retryAfter} giây trước khi yêu cầu mã mới.`, 429));
        }

        const otp = generateOtp();
        patientPasswordResetStore.set(phone, {
            otp,
            patientId: patient.id,
            requestedAt: now,
            expiresAt: now + OTP_TTL_MS,
        });

        writeLog('Yêu cầu OTP quên mật khẩu bệnh nhân', patient.name);

        if (patient.email) {
            await emailService.sendMail({
                to: patient.email,
                subject: 'Khôi phục mật khẩu - Hệ thống Đặt lịch khám',
                html: emailService.emailTemplates.otpReset({
                    name: patient.name,
                    otp,
                    expiresInMinutes: OTP_TTL_MS / 60000
                })
            }).catch(e => console.error('Lỗi khi gửi mail OTP:', e));
        }

        const isEthereal = env.emailProvider !== 'ses';
        
        return sendSuccess(res, {
            phone,
            expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
            ...(isEthereal && { previewOtp: otp }),
        }, isEthereal ? 'Mã OTP đã được tạo. Hiện hệ thống đang ở chế độ test nên mã được trả về để bạn kiểm tra.' : 'Mã xác thực đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.');
    } catch (err) {
        next(toAppError(err));
    }
};

exports.resetPatientPasswordWithOtp = async (req, res, next) => {
    try {
        const phone = normalizePhone(req.body.phone);
        const otp = String(req.body.otp || '').trim();
        const newPassword = String(req.body.newPassword || '');

        if (newPassword.trim().length < 6) {
            return next(new AppError('Mật khẩu mới phải có ít nhất 6 ký tự.', 400));
        }

        const patient = await db.findPatientByPhone(phone);
        if (!patient) {
            return next(new AppError('Không tìm thấy hồ sơ bệnh nhân với số điện thoại này.', 404));
        }

        const otpEntry = patientPasswordResetStore.get(phone);
        if (!otpEntry) {
            return next(new AppError('Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.', 400));
        }

        if (otpEntry.expiresAt < Date.now()) {
            patientPasswordResetStore.delete(phone);
            return next(new AppError('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 400));
        }

        if (otpEntry.patientId !== patient.id || otpEntry.otp !== otp) {
            return next(new AppError('Mã OTP không chính xác.', 400));
        }

        await db.updatePatient(patient.id, { password: newPassword });
        patientPasswordResetStore.delete(phone);
        writeLog('Đặt lại mật khẩu bệnh nhân bằng OTP', patient.name);

        return sendSuccess(res, null, 'Đặt lại mật khẩu thành công.');
    } catch (err) {
        next(toAppError(err));
    }
};

exports.staffLogin = async (req, res, next) => {
    try {
        const username = (req.body.username || '').trim();
        const password = (req.body.password || '').trim();

        const staff = await db.findStaffByUsername(username);
        
        if (staff) {
            const isMatch = await bcrypt.compare(password, staff.password);
            if (isMatch) {
                if (!staff.isActive) {
                    return next(new AppError('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.', 403));
                }
                const tokens = generateTokens({ id: staff.id, role: staff.role });

                writeLog('Đăng nhập hệ thống (JWT)', staff.name);

                const { password: _, ...staffWithoutPassword } = staff;
                return sendSuccess(res, { user: staffWithoutPassword, ...tokens }, 'Đăng nhập thành công.');
            }
        }
        
        return next(new AppError('Tài khoản hoặc mật khẩu không chính xác.', 401));
    } catch (err) {
        next(toAppError(err));
    }
};

exports.refreshToken = (req, res, next) => {
    const { token } = req.body;
    if (!token) return next(new AppError('Refresh Token required', 401));

    jwt.verify(token, jwtRefreshSecret, (err, user) => {
        if (err) return next(new AppError('Invalid Refresh Token', 403));
        const newTokens = generateTokens({ id: user.id, role: user.role });
        return sendSuccess(res, newTokens, 'Làm mới token thành công.');
    });
};
