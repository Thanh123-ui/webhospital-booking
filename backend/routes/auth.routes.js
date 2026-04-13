const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/patient/login', authController.patientLogin);
router.post('/staff/login', authController.staffLogin);
router.post('/refresh', authController.refreshToken);

module.exports = router;
