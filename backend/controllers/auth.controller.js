const db = require('../data/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { writeLog } = require('../utils/logger');

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'fallback_refresh_do_not_use_in_prod';

const generateTokens = (userPayload) => {
    const secret = getJwtSecret();
    const refreshSecret = getRefreshSecret();
    
    const accessToken = jwt.sign(userPayload, secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(userPayload, refreshSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

exports.patientLogin = async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điện thoại và mật khẩu.' });
        }

        const patient = await db.findPatientByPhone(phone);
        
        if (patient) {
            const isMatch = await bcrypt.compare(password, patient.password);
            if (isMatch) {
                const tokens = generateTokens({ id: patient.id, role: 'PATIENT' });
                const { password: _, ...patientWithoutPassword } = patient;
                return res.json({ success: true, user: patientWithoutPassword, ...tokens });
            }
        }
        
        return res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};

exports.staffLogin = async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const password = (req.body.password || '').trim();
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tài khoản và mật khẩu.' });
        }

        const staff = await db.findStaffByUsername(username);
        
        if (staff) {
            const isMatch = await bcrypt.compare(password, staff.password);
            if (isMatch) {
                if (!staff.isActive) {
                    return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.' });
                }
                const tokens = generateTokens({ id: staff.id, role: staff.role });

                writeLog('Đăng nhập hệ thống (JWT)', staff.name);

                const { password: _, ...staffWithoutPassword } = staff;
                return res.json({ success: true, user: staffWithoutPassword, ...tokens });
            }
        }
        
        return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};

exports.refreshToken = (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh Token required' });

    const refreshSecret = getRefreshSecret();

    jwt.verify(token, refreshSecret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Refresh Token' });
        const newTokens = generateTokens({ id: user.id, role: user.role });
        res.json(newTokens);
    });
};
