const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRequest, validators } = require('../middlewares/validation.middleware');

router.post('/patient/login', validateRequest([
  { field: 'phone', validate: validators.requiredString('Số điện thoại') },
  { field: 'password', validate: validators.requiredString('Mật khẩu') },
]), authController.patientLogin);
router.post('/patient/forgot-password/request-otp', validateRequest([
  { field: 'phone', validate: validators.requiredString('Số điện thoại') },
]), authController.requestPatientPasswordResetOtp);
router.post('/patient/forgot-password/reset', validateRequest([
  { field: 'phone', validate: validators.requiredString('Số điện thoại') },
  { field: 'otp', validate: validators.requiredString('Mã OTP') },
  { field: 'newPassword', validate: validators.requiredString('Mật khẩu mới') },
]), authController.resetPatientPasswordWithOtp);
router.post('/staff/login', validateRequest([
  { field: 'username', validate: validators.requiredString('Tài khoản') },
  { field: 'password', validate: validators.requiredString('Mật khẩu') },
]), authController.staffLogin);
router.post('/refresh', validateRequest([
  { field: 'token', validate: validators.requiredString('Refresh token') },
]), authController.refreshToken);

module.exports = router;
