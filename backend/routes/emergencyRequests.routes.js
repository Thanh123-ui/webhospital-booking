const express = require('express');
const router = express.Router();
const emergencyRequestsController = require('../controllers/emergencyRequests.controller');
const { createAntiSpamGuard } = require('../middlewares/antiSpam.middleware');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post(
  '/',
  createAntiSpamGuard({
    bucket: 'emergency-request',
    windowMs: 10 * 60 * 1000,
    max: 3,
    keyBuilder: (req) => `${req.ip}:${String(req.body.phone || '').trim()}`,
    message: 'Bạn đang gửi yêu cầu cấp cứu quá nhanh. Nếu thực sự khẩn cấp, vui lòng gọi trực tiếp 115 hoặc 1900 1234.',
  }),
  emergencyRequestsController.createEmergencyRequest
);

router.use(verifyToken);

router.get(
  '/',
  emergencyRequestsController.getAllEmergencyRequests
);

router.put(
  '/:id/status',
  emergencyRequestsController.updateEmergencyRequestStatus
);

module.exports = router;
