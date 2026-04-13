const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');

router.get('/', appointmentsController.getAllAppointments);
router.get('/search', appointmentsController.getAppointmentByCode);
router.post('/', appointmentsController.createAppointment);
router.put('/:id/status', appointmentsController.updateStatus);
router.put('/:id/vitals', appointmentsController.updateVitals);
router.put('/:id/complete', appointmentsController.completeMedicalRecord);
router.put('/:id/reschedule', appointmentsController.reschedule);
router.put('/:id/cancel', appointmentsController.cancelAppointment);

module.exports = router;
