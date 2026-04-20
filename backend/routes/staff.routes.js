const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.use(verifyToken);

router.get('/', verifyRole('ADMIN', 'BOD'), staffController.getAllStaff);
router.post('/', verifyRole('ADMIN'), staffController.addStaff);
router.put('/:id/role', verifyRole('ADMIN'), staffController.updateStaffRole);
router.put('/:id/toggle-active', verifyRole('ADMIN'), staffController.toggleStaffActive);
router.put('/:id/password', verifyRole('ADMIN'), staffController.updateStaffPassword);

module.exports = router;
