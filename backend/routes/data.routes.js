const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/departments', dataController.getDepartments);
router.get('/doctors', dataController.getDoctors);
router.get('/schedules', dataController.getSchedules);
router.post('/rate', dataController.rateDoctor);
router.get('/ratings', dataController.getTopDoctors);
router.get('/logs', verifyToken, verifyRole('ADMIN', 'BOD'), (req, res) => res.json(require('../utils/logger').getLogs()));

module.exports = router;
