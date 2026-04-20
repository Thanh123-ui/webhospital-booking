const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/search', appointmentsController.getAppointmentByCode);

// Mọi route dưới đây cần đăng nhập
router.use(verifyToken);

router.get('/', appointmentsController.getAllAppointments);
router.get('/emergency-transfers', verifyRole('ADMIN', 'BOD', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), appointmentsController.getEmergencyTransfers);

router.post('/', appointmentsController.createAppointment);

router.put('/:id/status', verifyRole('ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'), appointmentsController.updateStatus);
router.put('/:id/vitals', verifyRole('NURSE'), appointmentsController.updateVitals);
router.put('/:id/complete', verifyRole('DOCTOR'), appointmentsController.completeMedicalRecord);
router.put('/:id/reschedule', verifyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'), appointmentsController.reschedule);
router.put('/:id/cancel', appointmentsController.cancelAppointment); // PATIENT có thể tự hủy, Service sẽ check
router.put('/:id/transfer', verifyRole('DOCTOR', 'NURSE'), appointmentsController.transferPatient);

module.exports = router;
