const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');

router.get('/departments', dataController.getDepartments);
router.get('/doctors', dataController.getDoctors);
router.get('/schedules', dataController.getSchedules);
router.post('/rate', dataController.rateDoctor);
router.get('/ratings', dataController.getTopDoctors);
router.get('/logs', (req, res) => res.json(require('../utils/logger').getLogs()));

module.exports = router;
