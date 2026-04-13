const db = require('../data/db');
const jwt = require('jsonwebtoken');
const { writeLog } = require('../utils/logger');

const JWT_SECRET = 'clinic_care_super_secret_key_2024';
const JWT_REFRESH_SECRET = 'clinic_care_refresh_secret_9999';

const generateTokens = (userPayload) => {
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(userPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

exports.patientLogin = (req, res) => {
  const { phone, password } = req.body;
  const patient = db.patientsList.find(p => p.phone === phone && p.password === password);
  if (patient) {
    const tokens = generateTokens({ id: patient.id, role: 'PATIENT' });
    res.json({ success: true, user: patient, ...tokens });
  } else {
    res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng!' });
  }
};

exports.staffLogin = (req, res) => {
    const { username, password } = req.body;
    const staff = db.staffList.find(s => s.username === username && s.password === password);
    if (!staff) {
        return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' });
    }
    if (!staff.isActive) {
        return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.' });
    }
    const tokens = generateTokens({ id: staff.id, role: staff.role });
    
    // Thu thập log vào File
    writeLog('Đăng nhập hệ thống (JWT)', staff.name);

    res.json({ success: true, user: staff, ...tokens });
};

exports.refreshToken = (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh Token required' });

    jwt.verify(token, JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Refresh Token' });
        const newTokens = generateTokens({ id: user.id, role: user.role });
        res.json(newTokens);
    });
};
