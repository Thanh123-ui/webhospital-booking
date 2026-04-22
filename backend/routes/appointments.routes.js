const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');
const { createAntiSpamGuard } = require('../middlewares/antiSpam.middleware');
const { validateRequest, validators } = require('../middlewares/validation.middleware');

const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'READY', 'COMPLETED', 'CANCELED', 'TRANSFER_PENDING', 'NO_SHOW'];

router.get('/search', validateRequest([
  { in: 'query', field: 'code', validate: validators.requiredString('Mã lịch hẹn') },
  { in: 'query', field: 'phone', validate: validators.requiredString('Số điện thoại') },
]), appointmentsController.getAppointmentByCode);

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
  validateRequest([
    { field: 'phone', validate: validators.requiredString('Số điện thoại') },
    { field: 'doctorId', validate: validators.requiredString('Bác sĩ') },
    { field: 'date', validate: validators.requiredString('Ngày khám') },
    { field: 'time', validate: validators.requiredString('Giờ khám') },
  ]),
  appointmentsController.createAppointment
);

router.put('/:id/status', verifyRole('ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), validateRequest([
  { field: 'status', validate: validators.requiredEnum('Trạng thái', APPOINTMENT_STATUSES) },
]), appointmentsController.updateStatus);
router.put('/:id/vitals', verifyRole('NURSE'), validateRequest([
  { field: 'vitals', validate: validators.requiredObject('Thông tin sinh hiệu') },
]), appointmentsController.updateVitals);
router.put('/:id/complete', verifyRole('DOCTOR'), validateRequest([
  { field: 'record', validate: validators.requiredObject('Bệnh án') },
]), appointmentsController.completeMedicalRecord);
router.put('/:id/reschedule', verifyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'), validateRequest([
  { field: 'doctorId', validate: validators.requiredString('Bác sĩ') },
  { field: 'date', validate: validators.requiredString('Ngày khám') },
  { field: 'time', validate: validators.requiredString('Giờ khám') },
]), appointmentsController.reschedule);
router.put('/:id/no-show', verifyRole('ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), appointmentsController.markNoShow);
router.put('/:id/cancel', appointmentsController.cancelAppointment); // PATIENT có thể tự hủy, Service sẽ check
router.put('/:id/transfer', verifyRole('DOCTOR', 'NURSE'), validateRequest([
  { field: 'targetDeptId', validate: validators.requiredString('Khoa tiếp nhận') },
]), appointmentsController.transferPatient);

module.exports = router;
