require('dotenv').config();

const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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
  patientResetOtpLength: parseNumber(process.env.PATIENT_RESET_OTP_LENGTH, 6),
  patientResetOtpTtlSeconds: parseNumber(process.env.PATIENT_RESET_OTP_TTL_SECONDS, 300),
  patientResetOtpResendSeconds: parseNumber(process.env.PATIENT_RESET_OTP_RESEND_SECONDS, 60),
  patientResetOtpPreviewEnabled: String(process.env.PATIENT_RESET_OTP_PREVIEW || 'true').toLowerCase() !== 'false',
  awsRegion: process.env.AWS_REGION || '',
  awsSnsSenderId: process.env.AWS_SNS_SENDER_ID || '',
  emailProvider: (process.env.EMAIL_PROVIDER || 'ethereal').toLowerCase(),
  awsSesRegion: process.env.AWS_SES_REGION || '',
  awsSesAccessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || '',
  awsSesSecretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
};
