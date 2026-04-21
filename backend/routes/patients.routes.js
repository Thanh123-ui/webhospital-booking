const express = require('express');
const router = express.Router();
const patientsController = require('../controllers/patients.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.post('/register', patientsController.registerPatient);

router.use(verifyToken);

router.get('/', verifyRole('ADMIN', 'BOD', 'DOCTOR', 'NURSE', 'RECEPTIONIST'), patientsController.getAllPatients);
router.get('/:id', verifyRole('ADMIN', 'BOD', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'), patientsController.getPatientById);
router.put('/:id', verifyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'), patientsController.updatePatient);

module.exports = router;
