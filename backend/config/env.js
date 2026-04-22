require('dotenv').config();

const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const name of requiredVars) {
  if (!process.env[name] || !String(process.env[name]).trim()) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
