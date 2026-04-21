const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');
const { createAntiSpamGuard } = require('../middlewares/antiSpam.middleware');

router.get('/search', appointmentsController.getAppointmentByCode);

// Mọi route dưới đây cần đăng nhập
router.use(verifyToken);

router.get('/', appointmentsController.getAllAppointments);
router.get('/emergency-transfers', verifyRole('ADMIN', 'BOD', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), appointmentsController.getEmergencyTransfers);

router.post(
  '/',
  createAntiSpamGuard({
    bucket: 'booking',
    windowMs: 10 * 60 * 1000,
    max: 6,
    keyBuilder: (req) => `${req.ip}:${req.user?.id || ''}:${String(req.body.phone || '').trim()}`,
    message: 'Bạn đang gửi yêu cầu đặt lịch quá nhanh. Vui lòng chờ ít phút rồi thử lại.',
  }),
  appointmentsController.createAppointment
);

router.put('/:id/status', verifyRole('ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), appointmentsController.updateStatus);
router.put('/:id/vitals', verifyRole('NURSE'), appointmentsController.updateVitals);
router.put('/:id/complete', verifyRole('DOCTOR'), appointmentsController.completeMedicalRecord);
router.put('/:id/reschedule', verifyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'), appointmentsController.reschedule);
router.put('/:id/no-show', verifyRole('ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), appointmentsController.markNoShow);
router.put('/:id/cancel', appointmentsController.cancelAppointment); // PATIENT có thể tự hủy, Service sẽ check
router.put('/:id/transfer', verifyRole('DOCTOR', 'NURSE'), appointmentsController.transferPatient);

module.exports = router;
