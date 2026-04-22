const express = require('express');
const router = express.Router();
const emergencyRequestsController = require('../controllers/emergencyRequests.controller');
const { createAntiSpamGuard } = require('../middlewares/antiSpam.middleware');
const { verifyToken } = require('../middlewares/auth.middleware');
const { validateRequest, validators } = require('../middlewares/validation.middleware');

router.post(
  '/',
  createAntiSpamGuard({
    bucket: 'emergency-request',
    windowMs: 10 * 60 * 1000,
    max: 3,
    keyBuilder: (req) => `${req.ip}:${String(req.body.phone || '').trim()}`,
    message: 'Bạn đang gửi yêu cầu cấp cứu quá nhanh. Nếu thực sự khẩn cấp, vui lòng gọi trực tiếp 115 hoặc 1900 1234.',
  }),
  validateRequest([
    { field: 'name', validate: validators.requiredString('Họ tên') },
    { field: 'phone', validate: validators.requiredString('Số điện thoại') },
    { field: 'symptoms', validate: validators.requiredString('Tình trạng khẩn cấp') },
  ]),
  emergencyRequestsController.createEmergencyRequest
);

router.use(verifyToken);

router.get(
  '/',
  emergencyRequestsController.getAllEmergencyRequests
);

router.put(
  '/:id/status',
  validateRequest([
    { field: 'status', validate: validators.requiredEnum('Trạng thái', ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELED']) },
  ]),
  emergencyRequestsController.updateEmergencyRequestStatus
);

module.exports = router;
