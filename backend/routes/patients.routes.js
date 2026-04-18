const express = require('express');
const router = express.Router();
const patientsController = require('../controllers/patients.controller');

router.get('/', patientsController.getAllPatients);
router.post('/register', patientsController.registerPatient);
router.get('/:id', patientsController.getPatientById);
router.put('/:id', patientsController.updatePatient);

module.exports = router;
