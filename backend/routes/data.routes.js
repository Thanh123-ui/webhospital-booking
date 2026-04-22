const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');
const { validateRequest, validators } = require('../middlewares/validation.middleware');

router.get('/departments', dataController.getDepartments);
router.get('/doctors', dataController.getDoctors);
router.get('/schedules', dataController.getSchedules);
router.post('/rate', validateRequest([
  { field: 'rating', validate: validators.requiredString('Điểm đánh giá') },
]), dataController.rateDoctor);
router.get('/ratings', dataController.getTopDoctors);
router.get('/logs', verifyToken, verifyRole('ADMIN', 'BOD'), dataController.getSystemLogs);

module.exports = router;
