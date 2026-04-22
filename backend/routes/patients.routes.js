const express = require('express');
const router = express.Router();
const patientsController = require('../controllers/patients.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');
const { validateRequest, validators } = require('../middlewares/validation.middleware');

router.post('/register', validateRequest([
  { field: 'name', validate: validators.requiredString('Họ tên') },
  { field: 'phone', validate: validators.requiredString('Số điện thoại') },
  { field: 'password', validate: validators.requiredString('Mật khẩu') },
]), patientsController.registerPatient);

router.use(verifyToken);

router.get('/', verifyRole('ADMIN', 'BOD', 'DOCTOR', 'NURSE', 'RECEPTIONIST'), patientsController.getAllPatients);
router.get('/:id', verifyRole('ADMIN', 'BOD', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'), patientsController.getPatientById);
router.put('/:id', verifyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'), validateRequest([
  { field: 'cccd', validate: validators.optionalString() },
  { field: 'dob', validate: validators.optionalString() },
  { field: 'gender', validate: validators.optionalString() },
]), patientsController.updatePatient);

module.exports = router;
