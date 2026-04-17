const db = require('../data/db');
const { writeLog } = require('../utils/logger');

// ─── POLICY HELPERS ──────────────────────────────────────────────────────────

/**
 * checkCollision: đảm bảo không trùng lịch cùng bác sĩ, cùng khung giờ.
 * Mở rộng: cũng kiểm tra các bác sĩ khác trong cùng chuyên khoa để tránh
 * quá tải khoa (có thể bật/tắt tùy yêu cầu — hiện chỉ chặn trùng bác sĩ).
 */
async function checkCollision(doctorId, date, time, excludeId = null) {
    const staffList = await db.getStaff();
    const targetStaff = staffList.find(s => s.id === parseInt(doctorId));
    if (!targetStaff) return false;

    const appointments = await db.getAppointments();
    const conflicts = appointments.filter(a =>
        a.deptId === targetStaff.deptId &&
        a.date === date &&
        a.time === time &&
        a.status !== 'CANCELED' &&
        a.id !== excludeId
    );
    // Nếu khung giờ này của khoa đã đủ 5 người thì báo Full
    return conflicts.length >= 5;
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

/**
 * POLICY A — Anti-Spam: kiểm tra bệnh nhân có >= 2 lịch đang PENDING không.
 */
async function hasSpamBooking(phone, patientId) {
    const appointments = await db.getAppointments();
    const pendingCount = appointments.filter(a =>
        (a.phone === phone || (patientId && a.patientId === parseInt(patientId))) &&
        a.status === 'PENDING'
    ).length;
    return pendingCount >= 2;
}

/**
 * POLICY B — Kiểm tra còn đủ 24h trước giờ hẹn không (để cho phép hủy).
 */
function canCancelByTime(date, time) {
    const appointmentDT = new Date(`${date}T${time}:00`);
    const now = new Date();
    const diffMs = appointmentDT - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 24;
}

// ─────────────────────────────────────────────────────────────────────────────

exports.getAllAppointments = async (req, res) => {
    try {
        const { role, deptId } = req.query;
        let result = await db.getAppointments();

        if (role === 'DOCTOR' && deptId) {
            const parsedDeptId = parseInt(deptId);
            result = result.filter(a => a.deptId === parsedDeptId);
        }

        if (role === 'NURSE' && deptId) {
            const parsedDeptId = parseInt(deptId);
            result = result.filter(a => a.deptId === parsedDeptId);
        }

        const patients = await db.getPatients();
        result = result.map(a => {
            const patient = patients.find(p => p.phone === a.phone);
            return {
                ...a,
                patientDob: patient ? patient.dob : null,
                patientGender: patient ? patient.gender : null
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// GET single appointment — bảo mật: chỉ xem lịch của mình (theo phone + code)
exports.getAppointmentByCode = async (req, res) => {
    try {
        const { code, phone } = req.query;
        if (!code || !phone) return res.status(400).json({ message: 'Thiếu mã lịch hoặc số điện thoại.' });

        const appt = await db.findAppointmentByCode(code.trim().toUpperCase(), phone.trim());
        if (!appt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn phù hợp.' });

        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.createAppointment = async (req, res) => {
    try {
        const data = req.body;

        // ── POLICY A: Anti-Spam — chặn nếu bệnh nhân đang có >= 2 lịch PENDING ─
        if (!data.is_emergency && data.status !== 'EMERGENCY' && (data.phone || data.patientId)) {
            if (await hasSpamBooking(data.phone, data.patientId)) {
                return res.status(429).json({
                    message: 'Hệ thống ghi nhận Quý khách đang có từ 2 lịch hẹn chờ khám. \nNhằm đảm bảo cơ hội thăm khám cho cộng đồng, vui lòng hoàn tất hoặc hủy lịch cũ trước khi đặt thêm lịch mới.'
                });
            }
        }

        // ── POLICY 1: Chặn đặt lịch dưới 2 tiếng (bypass nếu is_emergency) ────
        if (!data.is_emergency && data.status !== 'EMERGENCY' && data.date && data.time) {
            if (isTooSoon(data.date, data.time)) {
                return res.status(400).json({
                    message: 'Giờ hẹn Quý khách chọn quá sát giờ hiện tại (dưới 2 tiếng). \nĐể Bệnh viện có thể chuẩn bị đón tiếp chu đáo nhất, vui lòng chọn khung giờ khác xa hơn. Trong trường hợp khẩn cấp, vui lòng đến trực tiếp Khoa Cấp Cứu hoặc gọi Hotline 1900 1234.'
                });
            }
        }

        // ── POLICY 2: Kiểm tra trùng lịch (collision) — bypass nếu cấp cứu ────
        if (!data.is_emergency && data.doctorId && data.date && data.time && data.status !== 'EMERGENCY') {
            if (await checkCollision(data.doctorId, data.date, data.time)) {
                return res.status(409).json({
                    message: 'Khung giờ này đã nhận đủ số lượng Thăm khám tối đa, nhằm đảm bảo chất lượng phục vụ và tránh quá tải cho Bác sĩ. \nQuý khách vui lòng chọn ca khám hoặc một Bác sĩ khác.'
                });
            }
        }

        const nextId = await db.nextAppointmentId();
        const newAppointment = {
            id: nextId,
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
            is_emergency: data.is_emergency || false,
            current_department: data.current_department || null,
            vitals: null,
            history: [{
                date: new Date().toISOString(),
                action: 'Tạo lịch mới',
                by: data.is_emergency ? 'Hệ thống Cấp cứu' : (data.status === 'EMERGENCY' ? 'Hệ thống Cấp cứu' : 'Bệnh nhân')
            }]
        };

        await db.saveAppointment(newAppointment);

        // Tăng booked count trong schedule
        if (data.doctorId && data.date && data.time) {
            await db.updateScheduleBooked(parseInt(data.doctorId), data.date, data.time, 1);
        }

        writeLog(`Đặt lịch mới: ${newAppointment.code} — ${newAppointment.patientName}`, 'Bệnh nhân');

        if (req.io) req.io.emit('new_appointment', newAppointment);

        res.status(201).json(newAppointment);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, role } = req.body;

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Đổi TT -> ${status}`,
            by: role || 'System'
        });

        const updated = await db.updateAppointment(parseInt(id), { status, history });

        writeLog(`Cập nhật trạng thái [${status}] cho ${appt.code}`, role || 'System');

        if (req.io) req.io.emit('update_appointment', updated);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.updateVitals = async (req, res) => {
    try {
        const { id } = req.params;
        const { vitals, role, staffId } = req.body;

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) return res.status(404).json({ message: 'Not found' });

        // Lưu sinh hiệu vào bảng vitals riêng
        if (db.saveVitals) {
            await db.saveVitals({
                appointmentId: parseInt(id),
                bloodPressure: vitals.bloodPressure,
                heartRate: vitals.heartRate ? parseInt(vitals.heartRate) : null,
                temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
                weight: vitals.weight ? parseFloat(vitals.weight) : null,
                height: vitals.height ? parseFloat(vitals.height) : null,
                spO2: vitals.spO2 ? parseFloat(vitals.spO2) : null,
                notes: vitals.notes || '',
                recordedBy: staffId ? parseInt(staffId) : null,
            });
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: 'Điều dưỡng đã đo sinh hiệu và chuyển cho bác sĩ',
            by: role
        });

        // Chuyển trạng thái sang READY (chờ bác sĩ khám)
        const updated = await db.updateAppointment(parseInt(id), { status: 'READY', history });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.completeMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { record, role, doctorName, deptId } = req.body;

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) return res.status(404).json({ message: 'Not found' });

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: 'Đã khám & lưu bệnh án',
            by: role
        });

        const updated = await db.updateAppointment(parseInt(id), { status: 'COMPLETED', history });

        writeLog('Khám xong & Lưu bệnh án', role || doctorName);

        // Lưu bệnh án vào hồ sơ bệnh nhân
        if (appt.patientId) {
            await db.appendMedicalHistory(appt.patientId, {
                id: Date.now(),
                date: appt.date,
                doctor: doctorName,
                deptId: deptId,
                diagnosis: record.diagnosis,
                prescription: record.prescription,
                notes: record.notes
            });
        }

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.reschedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { doctorId, date, time, reason, role } = req.body;

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) return res.status(404).json({ message: 'Not found' });

        if (await checkCollision(doctorId, date, time, parseInt(id))) {
            return res.status(409).json({ message: 'Khung giờ mới của khoa đã đạt giới hạn 5 bệnh nhân.' });
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Đổi lịch: ${reason}`,
            by: role
        });

        const updated = await db.updateAppointment(parseInt(id), {
            doctorId: parseInt(doctorId),
            date,
            time,
            status: 'CONFIRMED',
            history
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// ── POLICY 3 + 4: Cancel — chỉ PENDING + xác thực quyền sở hữu ─────────────
exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, reason, patientId, phone } = req.body;

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

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

        // POLICY B: Bệnh nhân chỉ được hủy nếu còn >= 24h trước giờ khám
        if (role === 'PATIENT' && appt.date && appt.time) {
            if (!canCancelByTime(appt.date, appt.time)) {
                return res.status(400).json({
                    message: 'Theo quy định, thao tác hủy lịch chỉ được thực hiện trên hệ thống tối thiểu 24 tiếng trước giờ hẹn để bác sĩ sắp xếp lịch trình.\nVui lòng liên hệ bộ phận CSKH qua Hotline 1900 1234 để được hỗ trợ trực tiếp.'
                });
            }
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Đã hủy: ${reason || 'Không rõ lý do'}`,
            by: role === 'PATIENT' ? `Bệnh nhân (${appt.patientName})` : (role || 'Unknown')
        });

        const updated = await db.updateAppointment(parseInt(id), { status: 'CANCELED', history });

        writeLog(`Hủy lịch khám ${appt.code} — ${appt.patientName}`, role || 'System');

        if (req.io) req.io.emit('update_appointment', updated);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// ── TRANSFER PATIENT: Bác sĩ cấp cứu chuyển hồ sơ sang khoa chuyên môn ──────
exports.transferPatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetDeptId, reason, transferredBy, transferredByName } = req.body;

        if (!targetDeptId || !transferredBy) {
            return res.status(400).json({ message: 'Thiếu thông tin khoa tiếp nhận hoặc người chuyển.' });
        }

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) return res.status(404).json({ message: 'Không tìm thấy hồ sơ.' });

        // Cấm chuyển khoa nếu đã COMPLETED
        if (appt.status === 'COMPLETED') {
            return res.status(400).json({ message: 'Không thể chuyển khoa vì hồ sơ này đã được khám xong và đóng lại.' });
        }

        // Cho phép mọi hồ sơ kể cả khám thường & cấp cứu đều được chuyển khoa.
        const departments = await db.getDepartments();
        const targetDept = departments.find(d => d.id === parseInt(targetDeptId));
        if (!targetDept) {
            return res.status(404).json({ message: 'Khoa tiếp nhận không tồn tại.' });
        }

        const prevDeptId = appt.current_department || appt.deptId;

        if (prevDeptId && parseInt(targetDeptId) === prevDeptId) {
            return res.status(400).json({ message: 'Không thể chuyển bệnh nhân vào chính khoa đang điều trị.' });
        }

        const prevDeptName = prevDeptId
            ? (departments.find(d => d.id === prevDeptId)?.name || 'Không rõ')
            : 'Cấp cứu';

        // Cập nhật hồ sơ
        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Chuyển khoa: ${prevDeptName} → ${targetDept.name}. Lý do: ${reason || 'Không ghi rõ'}`,
            by: transferredByName || `Staff #${transferredBy}`
        });

        const updated = await db.updateAppointment(parseInt(id), {
            current_department: parseInt(targetDeptId),
            deptId: parseInt(targetDeptId),
            status: 'TRANSFER_PENDING',
            history
        });

        // Log vào emergencyTransfers
        const transferRecord = {
            id: Date.now(),
            appointmentId: appt.id,
            appointmentCode: appt.code,
            patientId: appt.patientId,
            patientName: appt.patientName,
            fromDeptId: prevDeptId,
            fromDeptName: prevDeptName,
            toDeptId: parseInt(targetDeptId),
            toDeptName: targetDept.name,
            reason: reason || '',
            transferredBy: transferredBy,
            transferredByName: transferredByName || '',
            transferredAt: new Date().toISOString()
        };
        await db.addEmergencyTransfer(transferRecord);

        writeLog(`Chuyển hồ sơ cấp cứu ${appt.code} (${appt.patientName}) → ${targetDept.name}`, transferredByName || 'System');

        // Socket realtime: broadcast toàn bộ + emit riêng room khoa tiếp nhận
        if (req.io) {
            req.io.emit('emergency_transfer', {
                transfer: transferRecord,
                appointment: updated
            });
            req.io.to(`dept_${targetDeptId}`).emit('emergency_transfer_dept', {
                transfer: transferRecord,
                appointment: updated,
                alert: `⚠️ Hồ sơ cấp cứu ${appt.patientName} vừa được chuyển đến khoa bạn. Ưu tiên cao!`
            });
        }

        res.json({
            message: `Hồ sơ đã được chuyển thành công sang ${targetDept.name}`,
            appointment: updated,
            transfer: transferRecord
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Lấy lịch sử chuyển khoa cấp cứu
exports.getEmergencyTransfers = async (req, res) => {
    try {
        const transfers = await db.getEmergencyTransfers();
        res.json(transfers);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};
