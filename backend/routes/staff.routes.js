const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');

router.get('/', staffController.getAllStaff);
router.post('/', staffController.addStaff);
router.put('/:id/role', staffController.updateStaffRole);
router.put('/:id/toggle-active', staffController.toggleStaffActive);
router.put('/:id/password', staffController.updateStaffPassword);

module.exports = router;
