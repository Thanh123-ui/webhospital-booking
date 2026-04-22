const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');
const { validateRequest, validators } = require('../middlewares/validation.middleware');

router.use(verifyToken);

router.get('/', verifyRole('ADMIN', 'BOD'), staffController.getAllStaff);
router.post('/', verifyRole('ADMIN', 'BOD'), validateRequest([
  { field: 'name', validate: validators.requiredString('Họ tên') },
  { field: 'role', validate: validators.requiredString('Vai trò') },
  { field: 'username', validate: validators.requiredString('Tên đăng nhập') },
  { field: 'password', validate: validators.requiredString('Mật khẩu') },
]), staffController.addStaff);
router.put('/:id/role', verifyRole('ADMIN'), validateRequest([
  { field: 'role', validate: validators.requiredString('Vai trò') },
]), staffController.updateStaffRole);
router.put('/:id/toggle-active', verifyRole('ADMIN', 'BOD'), staffController.toggleStaffActive);
router.put('/:id/password', verifyRole('ADMIN'), validateRequest([
  { field: 'newPassword', validate: validators.requiredString('Mật khẩu mới') },
]), staffController.updateStaffPassword);

module.exports = router;
