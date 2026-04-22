const db = require('../data/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { writeLog } = require('../utils/logger');
const { jwtSecret, jwtRefreshSecret } = require('../config/env');
const { AppError, sendSuccess, toAppError } = require('../utils/http');

const generateTokens = (userPayload) => {
    const accessToken = jwt.sign(userPayload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(userPayload, jwtRefreshSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

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
