const appointmentService = require('../services/appointments.service');
const { writeLog } = require('../utils/logger');
const db = require('../data/db');
const { AppError, sendSuccess, toAppError } = require('../utils/http');
const emailService = require('../utils/email');

exports.getAllAppointments = async (req, res, next) => {
    try {
        const user = req.user;
        const result = await appointmentService.getAllAppointments(user);
        sendSuccess(res, result);
    } catch (err) {
        next(toAppError(err));
    }
};

exports.getAppointmentByCode = async (req, res, next) => {
    try {
        const { code, phone } = req.query;
        const appt = await appointmentService.getAppointmentByCode(code, phone);
        sendSuccess(res, appt);
    } catch (err) {
        if (err.message.includes('Thiếu') || err.message.includes('Không tìm thấy')) {
             return next(new AppError(err.message, err.message.includes('Thiếu') ? 400 : 404));
        }
        next(toAppError(err));
    }
};

exports.createAppointment = async (req, res, next) => {
    try {
        const user = req.user;
        const newAppointment = await appointmentService.createAppointment(req.body, user);

        writeLog(`Đặt lịch mới: ${newAppointment.code} — ${newAppointment.patientName}`, user.name || 'Bệnh nhân');
        if (req.io) req.io.emit('new_appointment', newAppointment);

        // Gửi email xác nhận (không block response)
        (async () => {
            try {
                const patient = await db.findPatientById(newAppointment.patientId);
                if (patient && patient.email) {
                    const departments = await db.getDepartments();
                    const staffList = await db.getStaff();
                    const dept = departments.find(d => d.id === newAppointment.deptId);
                    const doc = staffList.find(s => s.id === newAppointment.doctorId);

                    await emailService.sendMail({
                        to: patient.email,
                        subject: 'Xác nhận đặt lịch khám - Hệ thống Bệnh viện',
                        html: emailService.emailTemplates.appointmentConfirmed({
                            name: patient.name,
                            code: newAppointment.code,
                            date: newAppointment.date,
                            time: newAppointment.time,
                            doctorName: doc ? doc.name : 'Chưa xếp',
                            deptName: dept ? dept.name : 'Không rõ',
                        })
                    });
                }
            } catch (err) {
                console.error('Lỗi khi gửi mail xác nhận đặt lịch:', err);
            }
        })();

        sendSuccess(res, newAppointment, 'Đặt lịch thành công.', 201);
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        else if (msg.includes('Phiên đăng nhập')) status = 403;
        else if (msg.includes('Hệ thống ghi nhận') || msg.includes('quá nhanh')) status = 429;
        else if (msg.includes('Khung giờ này')) status = 409;
        
        next(new AppError(msg, status));
    }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = req.user;

        const updated = await appointmentService.updateStatus(id, status, user);
        
        writeLog(`Cập nhật trạng thái [${status}] cho ${updated.code}`, user.name || user.role);
        if (req.io) req.io.emit('update_appointment', updated);

        sendSuccess(res, updated, 'Cập nhật trạng thái thành công.');
    } catch (err) {
        const msg = err.message;
        if (msg.includes('Không tìm thấy')) return next(new AppError(msg, 404));
        if (msg.includes('không có quyền')) return next(new AppError(msg, 403));
        next(new AppError(msg, 400));
    }
};

exports.updateVitals = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { vitals } = req.body;
        const user = req.user;

        const updated = await appointmentService.updateVitals(id, vitals, user);
        sendSuccess(res, updated, 'Lưu sinh hiệu thành công.');
    } catch (err) {
        const msg = err.message;
        if (msg === 'Not found') return next(new AppError(msg, 404));
        if (msg.includes('không có quyền')) return next(new AppError(msg, 403));
        next(new AppError(msg, 400));
    }
};

exports.completeMedicalRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { record } = req.body;
        const user = req.user;

        const updated = await appointmentService.completeMedicalRecord(id, record, user);
        writeLog('Khám xong & Lưu bệnh án', user.name || user.role);
        sendSuccess(res, updated, 'Lưu bệnh án thành công.');
    } catch (err) {
        const msg = err.message;
        if (msg === 'Not found') return next(new AppError(msg, 404));
        if (msg.includes('không có quyền')) return next(new AppError(msg, 403));
        next(new AppError(msg, 400));
    }
};

exports.reschedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const updated = await appointmentService.reschedule(id, req.body, user);
        sendSuccess(res, updated, 'Đổi lịch thành công.');
    } catch (err) {
        if (err.message === 'Not found') return next(new AppError(err.message, 404));
        if (err.message.includes('đạt giới hạn') || err.message.includes('Không tìm thấy lịch trống')) return next(new AppError(err.message, 409));
        next(new AppError(err.message, 400));
    }
};

exports.markNoShow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const updated = await appointmentService.markNoShow(id, reason, user);
        writeLog(`Đánh dấu vắng mặt ${updated.code} — ${updated.patientName}`, user.name || user.role);
        if (req.io) req.io.emit('update_appointment', updated);

        sendSuccess(res, updated, 'Đã đánh dấu vắng mặt.');
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        next(new AppError(msg, status));
    }
};

exports.cancelAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const updated = await appointmentService.cancelAppointment(id, reason, user);

        writeLog(`Hủy lịch khám ${updated.code} — ${updated.patientName}`, user.name || user.role);
        if (req.io) req.io.emit('update_appointment', updated);

        sendSuccess(res, updated, 'Hủy lịch thành công.');
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        else if (msg.includes('Bạn không có quyền')) status = 403;
        
        next(new AppError(msg, status));
    }
};

exports.transferPatient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const { updated, transferRecord, targetDept } = await appointmentService.transferPatient(id, req.body, user);

        writeLog(`Chuyển hồ sơ cấp cứu ${updated.code} (${updated.patientName}) → ${targetDept.name}`, user.name || user.role);

        if (req.io) {
            req.io.emit('emergency_transfer', { transfer: transferRecord, appointment: updated });
            req.io.to(`dept_${targetDept.id}`).emit('emergency_transfer_dept', {
                transfer: transferRecord,
                appointment: updated,
                alert: `⚠️ Hồ sơ cấp cứu ${updated.patientName} vừa được chuyển đến khoa bạn. Ưu tiên cao!`
            });
        }

        sendSuccess(res, {
            appointment: updated,
            transfer: transferRecord,
            targetDept
        }, `Hồ sơ đã được chuyển thành công sang ${targetDept.name}`);
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        
        next(new AppError(msg, status));
    }
};

exports.getEmergencyTransfers = async (req, res, next) => {
    try {
        const transfers = await db.getEmergencyTransfers();
        sendSuccess(res, transfers);
    } catch (err) {
        next(toAppError(err));
    }
};
