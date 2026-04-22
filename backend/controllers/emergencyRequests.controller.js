const emergencyRequestsService = require('../services/emergencyRequests.service');
const { writeLog } = require('../utils/logger');
const db = require('../data/db');
const { AppError, sendSuccess, toAppError } = require('../utils/http');

async function ensureEmergencyAccess(user) {
  if (!user?.id || !user?.role) {
    const err = new Error('Bạn chưa đăng nhập.');
    err.status = 401;
    throw err;
  }

  if (user.role === 'RECEPTIONIST') {
    return;
  }

  if (!['DOCTOR', 'NURSE'].includes(user.role)) {
    const err = new Error('Chỉ bộ phận tiếp nhận và khoa Cấp cứu mới được xem cảnh báo cấp cứu.');
    err.status = 403;
    throw err;
  }

  const staffList = await db.getStaff();
  const departments = await db.getDepartments();
  const currentStaff = staffList.find((staff) => staff.id === user.id);
  const currentDept = departments.find((dept) => dept.id === currentStaff?.deptId);

  if (!currentDept?.isEmergency) {
    const err = new Error('Chỉ bộ phận tiếp nhận và khoa Cấp cứu mới được xem cảnh báo cấp cứu.');
    err.status = 403;
    throw err;
  }
}

exports.createEmergencyRequest = async (req, res, next) => {
  try {
    const request = await emergencyRequestsService.createEmergencyRequest(req.body);

    writeLog(`Yêu cầu cấp cứu mới: ${request.code} — ${request.requesterName}`, 'Cổng cấp cứu');
    if (req.io) req.io.to('emergency_alerts').emit('new_emergency_request', request);

    sendSuccess(res, request, 'Đã ghi nhận yêu cầu cấp cứu.', 201);
  } catch (err) {
    const msg = err.message;
    let status = 400;
    if (msg.includes('đã ghi nhận') || msg.includes('quá nhiều')) status = 429;

    next(new AppError(msg, status));
  }
};

exports.getAllEmergencyRequests = async (req, res, next) => {
  try {
    await ensureEmergencyAccess(req.user);
    const requests = await emergencyRequestsService.getAllEmergencyRequests();
    sendSuccess(res, requests);
  } catch (err) {
    next(toAppError(err));
  }
};

exports.updateEmergencyRequestStatus = async (req, res, next) => {
  try {
    await ensureEmergencyAccess(req.user);
    const updated = await emergencyRequestsService.updateEmergencyRequestStatus(req.params.id, req.body, req.user);

    writeLog(`Cập nhật yêu cầu cấp cứu ${updated.code} -> ${updated.status}`, req.user.name || req.user.role);
    if (req.io) req.io.to('emergency_alerts').emit('update_emergency_request', updated);

    sendSuccess(res, updated, 'Cập nhật yêu cầu cấp cứu thành công.');
  } catch (err) {
    const msg = err.message;
    let status = err.status || 400;
    if (msg.includes('Không tìm thấy')) status = 404;

    next(new AppError(msg, status));
  }
};
