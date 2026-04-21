const appointmentService = require('../services/appointments.service');
const { writeLog } = require('../utils/logger');
const db = require('../data/db');

exports.getAllAppointments = async (req, res) => {
    try {
        const user = req.user;
        const result = await appointmentService.getAllAppointments(user);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.getAppointmentByCode = async (req, res) => {
    try {
        const { code, phone } = req.query;
        const appt = await appointmentService.getAppointmentByCode(code, phone);
        res.json(appt);
    } catch (err) {
        if (err.message.includes('Thiếu') || err.message.includes('Không tìm thấy')) {
             return res.status(err.message.includes('Thiếu') ? 400 : 404).json({ message: err.message });
        }
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const user = req.user;
        const newAppointment = await appointmentService.createAppointment(req.body, user);

        writeLog(`Đặt lịch mới: ${newAppointment.code} — ${newAppointment.patientName}`, user.name || 'Bệnh nhân');
        if (req.io) req.io.emit('new_appointment', newAppointment);

        res.status(201).json(newAppointment);
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        else if (msg.includes('Phiên đăng nhập')) status = 403;
        else if (msg.includes('Hệ thống ghi nhận') || msg.includes('quá nhanh')) status = 429;
        else if (msg.includes('Khung giờ này')) status = 409;
        
        res.status(status).json({ message: msg });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = req.user;

        const updated = await appointmentService.updateStatus(id, status, user);
        
        writeLog(`Cập nhật trạng thái [${status}] cho ${updated.code}`, user.name || user.role);
        if (req.io) req.io.emit('update_appointment', updated);

        res.json(updated);
    } catch (err) {
        const msg = err.message;
        if (msg.includes('Không tìm thấy')) return res.status(404).json({ message: msg });
        if (msg.includes('không có quyền')) return res.status(403).json({ message: msg });
        res.status(400).json({ message: msg });
    }
};

exports.updateVitals = async (req, res) => {
    try {
        const { id } = req.params;
        const { vitals } = req.body;
        const user = req.user;

        const updated = await appointmentService.updateVitals(id, vitals, user);
        res.json(updated);
    } catch (err) {
        const msg = err.message;
        if (msg === 'Not found') return res.status(404).json({ message: msg });
        if (msg.includes('không có quyền')) return res.status(403).json({ message: msg });
        res.status(400).json({ message: msg });
    }
};

exports.completeMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { record } = req.body;
        const user = req.user;

        const updated = await appointmentService.completeMedicalRecord(id, record, user);
        writeLog('Khám xong & Lưu bệnh án', user.name || user.role);
        res.json(updated);
    } catch (err) {
        const msg = err.message;
        if (msg === 'Not found') return res.status(404).json({ message: msg });
        if (msg.includes('không có quyền')) return res.status(403).json({ message: msg });
        res.status(400).json({ message: msg });
    }
};

exports.reschedule = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const updated = await appointmentService.reschedule(id, req.body, user);
        res.json(updated);
    } catch (err) {
        if (err.message === 'Not found') return res.status(404).json({ message: err.message });
        if (err.message.includes('đạt giới hạn') || err.message.includes('Không tìm thấy lịch trống')) return res.status(409).json({ message: err.message });
        res.status(400).json({ message: err.message });
    }
};

exports.markNoShow = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const updated = await appointmentService.markNoShow(id, reason, user);
        writeLog(`Đánh dấu vắng mặt ${updated.code} — ${updated.patientName}`, user.name || user.role);
        if (req.io) req.io.emit('update_appointment', updated);

        res.json(updated);
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        res.status(status).json({ message: msg });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const updated = await appointmentService.cancelAppointment(id, reason, user);

        writeLog(`Hủy lịch khám ${updated.code} — ${updated.patientName}`, user.name || user.role);
        if (req.io) req.io.emit('update_appointment', updated);

        res.json(updated);
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        else if (msg.includes('Bạn không có quyền')) status = 403;
        
        res.status(status).json({ message: msg });
    }
};

exports.transferPatient = async (req, res) => {
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

        res.json({
            message: `Hồ sơ đã được chuyển thành công sang ${targetDept.name}`,
            appointment: updated,
            transfer: transferRecord
        });
    } catch (err) {
        const msg = err.message;
        let status = 400;
        if (msg.includes('Không tìm thấy')) status = 404;
        
        res.status(status).json({ message: msg });
    }
};

exports.getEmergencyTransfers = async (req, res) => {
    try {
        const transfers = await db.getEmergencyTransfers();
        res.json(transfers);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};
