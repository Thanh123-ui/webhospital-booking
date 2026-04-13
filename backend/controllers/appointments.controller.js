const db = require('../data/db');
const { writeLog } = require('../utils/logger');

// ─── POLICY HELPERS ──────────────────────────────────────────────────────────

/**
 * checkCollision: đảm bảo không trùng lịch cùng bác sĩ, cùng khung giờ.
 * Mở rộng: cũng kiểm tra các bác sĩ khác trong cùng chuyên khoa để tránh
 * quá tải khoa (có thể bật/tắt tùy yêu cầu — hiện chỉ chặn trùng bác sĩ).
 */
function checkCollision(doctorId, date, time, excludeId = null) {
    const conflicts = db.appointmentsList.filter(a =>
        a.doctorId === parseInt(doctorId) &&
        a.date === date &&
        a.time === time &&
        a.status !== 'CANCELED' &&
        a.id !== excludeId
    );
    return conflicts.length > 0;
}

/**
 * Chặn đặt lịch nếu thời gian khám cách hiện tại dưới 2 tiếng.
 */
function isTooSoon(date, time) {
    const appointmentDT = new Date(`${date}T${time}:00`);
    const now = new Date();
    const diffMs = appointmentDT - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 2;
}

// ─────────────────────────────────────────────────────────────────────────────

exports.getAllAppointments = (req, res) => {
    const { role, deptId } = req.query;
    let result = db.appointmentsList;

    if (role === 'DOCTOR' && deptId) {
        const parsedDeptId = parseInt(deptId);
        const docIds = db.staffList
            .filter(s => s.role === 'DOCTOR' && s.deptId === parsedDeptId)
            .map(s => s.id);
        result = result.filter(a => docIds.includes(a.doctorId));
    }

    if (role === 'NURSE' && deptId) {
        const parsedDeptId = parseInt(deptId);
        const docIds = db.staffList
            .filter(s => s.role === 'DOCTOR' && s.deptId === parsedDeptId)
            .map(s => s.id);
        result = result.filter(a => docIds.includes(a.doctorId));
    }

    res.json(result);
};

// GET single appointment — bảo mật: chỉ xem lịch của mình (theo phone + code)
exports.getAppointmentByCode = (req, res) => {
    const { code, phone } = req.query;
    if (!code || !phone) return res.status(400).json({ message: 'Thiếu mã lịch hoặc số điện thoại.' });

    const appt = db.appointmentsList.find(
        a => a.code === code.trim().toUpperCase() && a.phone === phone.trim()
    );
    if (!appt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn phù hợp.' });

    res.json(appt);
};

exports.createAppointment = (req, res) => {
    const data = req.body;

    // ── POLICY 1: Chặn đặt lịch dưới 2 tiếng ──────────────────────────────
    if (data.status !== 'EMERGENCY' && data.date && data.time) {
        if (isTooSoon(data.date, data.time)) {
            return res.status(400).json({
                message: 'Không thể đặt lịch cho khung giờ cách hiện tại dưới 2 tiếng. Vui lòng chọn khung giờ khác hoặc gọi hotline để đặt khẩn.'
            });
        }
    }

    // ── POLICY 2: Kiểm tra trùng lịch (collision) ──────────────────────────
    if (data.doctorId && data.date && data.time && data.status !== 'EMERGENCY') {
        if (checkCollision(data.doctorId, data.date, data.time)) {
            return res.status(409).json({
                message: 'Khung giờ này đã có bệnh nhân khác đặt với cùng bác sĩ. Vui lòng chọn khung giờ hoặc bác sĩ khác.'
            });
        }
    }

    const newAppointment = {
        id: db.appointmentsList.length + 1,
        code: data.code || `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: data.patientId,
        patientName: data.name,
        phone: data.phone,
        doctorId: data.doctorId,
        deptId: data.deptId || null,
        date: data.date,
        time: data.time,
        status: data.status || 'PENDING',
        symptoms: data.symptoms || '',
        vitals: null,
        history: [{
            date: new Date().toISOString(),
            action: 'Tạo lịch mới',
            by: data.status === 'EMERGENCY' ? 'Hệ thống Cấp cứu' : 'Bệnh nhân'
        }]
    };

    db.appointmentsList.unshift(newAppointment);

    // Tăng booked count trong schedule
    const schedIndex = db.schedules.findIndex(
        s => s.doctorId === parseInt(data.doctorId) && s.date === data.date && s.time === data.time
    );
    if (schedIndex !== -1) db.schedules[schedIndex].booked += 1;

    writeLog(`Đặt lịch mới: ${newAppointment.code} — ${newAppointment.patientName}`, 'Bệnh nhân');

    if (req.io) req.io.emit('new_appointment', newAppointment);

    res.status(201).json(newAppointment);
};

exports.updateStatus = (req, res) => {
    const { id } = req.params;
    const { status, role } = req.body;

    const apptIndex = db.appointmentsList.findIndex(a => a.id === parseInt(id));
    if (apptIndex === -1) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });

    db.appointmentsList[apptIndex].status = status;
    db.appointmentsList[apptIndex].history.push({
        date: new Date().toISOString(),
        action: `Đổi TT -> ${status}`,
        by: role || 'System'
    });

    writeLog(`Cập nhật trạng thái [${status}] cho ${db.appointmentsList[apptIndex].code}`, role || 'System');

    if (req.io) req.io.emit('update_appointment', db.appointmentsList[apptIndex]);

    res.json(db.appointmentsList[apptIndex]);
};

exports.updateVitals = (req, res) => {
    const { id } = req.params;
    const { vitals, role } = req.body;

    const apptIndex = db.appointmentsList.findIndex(a => a.id === parseInt(id));
    if (apptIndex === -1) return res.status(404).json({ message: 'Not found' });

    db.appointmentsList[apptIndex].status = 'READY';
    db.appointmentsList[apptIndex].vitals = vitals;
    db.appointmentsList[apptIndex].history.push({
        date: new Date().toISOString(),
        action: 'Điều dưỡng đã đo sinh hiệu',
        by: role
    });

    res.json(db.appointmentsList[apptIndex]);
};

exports.completeMedicalRecord = (req, res) => {
    const { id } = req.params;
    const { record, role, doctorName, deptId } = req.body;

    const apptIndex = db.appointmentsList.findIndex(a => a.id === parseInt(id));
    if (apptIndex === -1) return res.status(404).json({ message: 'Not found' });

    db.appointmentsList[apptIndex].status = 'COMPLETED';
    db.appointmentsList[apptIndex].history.push({
        date: new Date().toISOString(),
        action: 'Đã khám & lưu bệnh án',
        by: role
    });

    writeLog('Khám xong & Lưu bệnh án', role || doctorName);

    const patientId = db.appointmentsList[apptIndex].patientId;
    const patient = db.patientsList.find(p => p.id === patientId);
    if (patient) {
        patient.medicalHistory.unshift({
            id: Date.now(),
            date: db.appointmentsList[apptIndex].date,
            doctor: doctorName,
            deptId: deptId,
            diagnosis: record.diagnosis,
            prescription: record.prescription,
            notes: record.notes
        });
    }

    res.json(db.appointmentsList[apptIndex]);
};

exports.reschedule = (req, res) => {
    const { id } = req.params;
    const { doctorId, date, time, reason, role } = req.body;

    const apptIndex = db.appointmentsList.findIndex(a => a.id === parseInt(id));
    if (apptIndex === -1) return res.status(404).json({ message: 'Not found' });

    if (checkCollision(doctorId, date, time, parseInt(id))) {
        return res.status(409).json({ message: 'Khung giờ mới đã bị trùng lịch với bác sĩ này.' });
    }

    db.appointmentsList[apptIndex].doctorId = parseInt(doctorId);
    db.appointmentsList[apptIndex].date = date;
    db.appointmentsList[apptIndex].time = time;
    db.appointmentsList[apptIndex].status = 'CONFIRMED';
    db.appointmentsList[apptIndex].history.push({
        date: new Date().toISOString(),
        action: `Đổi lịch: ${reason}`,
        by: role
    });

    res.json(db.appointmentsList[apptIndex]);
};

// ── POLICY 3 + 4: Cancel — chỉ PENDING + xác thực quyền sở hữu ─────────────
exports.cancelAppointment = (req, res) => {
    const { id } = req.params;
    const { role, reason, patientId, phone } = req.body;

    const apptIndex = db.appointmentsList.findIndex(a => a.id === parseInt(id));
    if (apptIndex === -1) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

    const appt = db.appointmentsList[apptIndex];

    // POLICY 4: Bệnh nhân chỉ được hủy lịch của mình
    if (role === 'PATIENT') {
        const isOwner = (patientId && appt.patientId === parseInt(patientId)) ||
                        (phone && appt.phone === phone);
        if (!isOwner) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy lịch của người khác.' });
        }
    }

    // POLICY 3: Chỉ được hủy khi đang PENDING
    if (appt.status !== 'PENDING') {
        return res.status(400).json({
            message: `Không thể hủy lịch đang ở trạng thái "${appt.status}". Chỉ có thể hủy khi lịch chưa được xác nhận (PENDING).`
        });
    }

    db.appointmentsList[apptIndex].status = 'CANCELED';
    db.appointmentsList[apptIndex].history.push({
        date: new Date().toISOString(),
        action: `Đã hủy: ${reason || 'Không rõ lý do'}`,
        by: role === 'PATIENT' ? `Bệnh nhân (${appt.patientName})` : (role || 'Unknown')
    });

    writeLog(`Hủy lịch khám ${appt.code} — ${appt.patientName}`, role || 'System');

    if (req.io) req.io.emit('update_appointment', db.appointmentsList[apptIndex]);

    res.json(db.appointmentsList[apptIndex]);
};
