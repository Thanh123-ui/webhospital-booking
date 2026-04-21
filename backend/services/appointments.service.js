const db = require('../data/db');

const NURSE_VISIBLE_STATUSES = new Set([
    'ARRIVED',
    'READY',
    'TRANSFER_PENDING',
    'COMPLETED',
    'NO_SHOW',
    'CANCELED',
]);

const DOCTOR_VISIBLE_STATUSES = new Set([
    'READY',
    'TRANSFER_PENDING',
    'COMPLETED',
    'NO_SHOW',
    'CANCELED',
]);

class AppointmentService {
    normalizeDate(dateValue) {
        if (!dateValue) return '';
        if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        const raw = String(dateValue);
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
        return this.normalizeDate(parsed);
    }

    async checkCollision(doctorId, date, time, excludeId = null) {
        const staffList = await db.getStaff();
        const targetStaff = staffList.find(s => s.id === parseInt(doctorId));
        if (!targetStaff) return false;

        const appointments = await db.getAppointments();
        const conflicts = appointments.filter(a =>
            a.deptId === targetStaff.deptId &&
            this.normalizeDate(a.date) === this.normalizeDate(date) &&
            a.time === time &&
            a.status !== 'CANCELED' &&
            a.id !== excludeId
        );
        return conflicts.length >= 5;
    }

    getEffectiveDeptId(appt, staffList) {
        if (appt.current_department) return parseInt(appt.current_department);
        if (appt.deptId) return parseInt(appt.deptId);

        const assignedDoctor = staffList.find(s => s.id === parseInt(appt.doctorId));
        return assignedDoctor?.deptId ? parseInt(assignedDoctor.deptId) : null;
    }

    getVisibleStatusesByRole(role) {
        if (role === 'NURSE') return NURSE_VISIBLE_STATUSES;
        if (role === 'DOCTOR') return DOCTOR_VISIBLE_STATUSES;
        return null;
    }

    async getStaffContext(user) {
        const staffList = await db.getStaff();
        const currentStaff = staffList.find((staff) => staff.id === user.id);
        return { staffList, currentStaff };
    }

    async ensureDeptAccess(appt, user) {
        if (!['DOCTOR', 'NURSE'].includes(user.role)) {
            return;
        }

        const { staffList, currentStaff } = await this.getStaffContext(user);
        const currentDeptId = currentStaff?.deptId ? parseInt(currentStaff.deptId) : null;
        const effectiveDeptId = this.getEffectiveDeptId(appt, staffList);

        if (!currentDeptId || effectiveDeptId !== currentDeptId) {
            throw new Error('Bạn không có quyền xử lý lịch hẹn ngoài khoa của mình.');
        }
    }

    isTooSoon(date, time) {
        const appointmentDT = new Date(`${this.normalizeDate(date)}T${time}:00`);
        const now = new Date();
        const diffMs = appointmentDT - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours < 2;
    }

    async hasSpamBooking(phone, patientId) {
        const appointments = await db.getAppointments();
        const pendingCount = appointments.filter(a =>
            (a.phone === phone || (patientId && a.patientId === parseInt(patientId))) &&
            a.status === 'PENDING'
        ).length;
        return pendingCount >= 2;
    }

    async hasRecentBookingSpam(phone, patientId) {
        const appointments = await db.getAppointments();
        const now = Date.now();
        const recentAttempts = appointments.filter((appointment) => {
            if (!(appointment.phone === phone || (patientId && appointment.patientId === parseInt(patientId)))) {
                return false;
            }
            const createdAt = new Date(appointment.createdAt || 0).getTime();
            if (!createdAt) return false;
            return now - createdAt < 10 * 60 * 1000;
        });

        return recentAttempts.length >= 3;
    }

    canCancelByTime(date, time) {
        const appointmentDT = new Date(`${this.normalizeDate(date)}T${time}:00`);
        const now = new Date();
        const diffMs = appointmentDT - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 24;
    }

    async getAllAppointments(user) {
        let result = await db.getAppointments();
        const staffList = await db.getStaff();
        const patients = await db.getPatients();

        result = result.filter(a => !a.is_emergency && a.status !== 'EMERGENCY');

        if (user.role === 'PATIENT') {
            result = result.filter(a => a.patientId === user.id);
        } else if (user.role === 'DOCTOR' || user.role === 'NURSE') {
            const userStaff = staffList.find(s => s.id === user.id);
            if (!userStaff || !userStaff.deptId) {
                return [];
            }
            const visibleStatuses = this.getVisibleStatusesByRole(user.role);
            result = result.filter(a => this.getEffectiveDeptId(a, staffList) === parseInt(userStaff.deptId));
            if (visibleStatuses) {
                result = result.filter(a => visibleStatuses.has(a.status));
            }
        }
        // ADMIN, BOD, RECEPTIONIST can see all

        return result.map(a => {
            const patient = patients.find(p => p.phone === a.phone);
            return {
                ...a,
                patientDob: patient ? patient.dob : null,
                patientGender: patient ? patient.gender : null
            };
        });
    }

    async getAppointmentByCode(code, phone) {
        if (!code || !phone) throw new Error('Thiếu mã lịch hoặc số điện thoại.');
        const appt = await db.findAppointmentByCode(code.trim().toUpperCase(), phone.trim());
        if (!appt) throw new Error('Không tìm thấy lịch hẹn phù hợp.');
        return appt;
    }

    async createAppointment(data, user) {
        if (data.is_emergency || data.status === 'EMERGENCY') {
            throw new Error('Yêu cầu cấp cứu phải đi qua API hỗ trợ cấp cứu riêng, không dùng luồng đặt lịch thường.');
        }

        if (user.role === 'PATIENT' && data.patientId && parseInt(data.patientId) !== user.id) {
             throw new Error('Phiên đăng nhập không khớp với hồ sơ bệnh nhân đang đặt lịch.');
        }
        
        const patientId = data.patientId ? parseInt(data.patientId) : user.id;
        const patient = await db.findPatientById(patientId);
        if (!patient) throw new Error('Không tìm thấy hồ sơ bệnh nhân.');

        if (user.role === 'PATIENT' && (data.phone || '').trim() !== patient.phone) {
             throw new Error('Thông tin số điện thoại không khớp với hồ sơ đăng nhập.');
        }

        const staffList = await db.getStaff();
        const assignedDoctor = staffList.find(s => s.id === parseInt(data.doctorId) && s.role === 'DOCTOR' && s.isActive);
        if (!assignedDoctor) throw new Error('Bác sĩ được chọn không tồn tại hoặc hiện không hoạt động.');

        const resolvedDeptId = data.deptId ? parseInt(data.deptId) : assignedDoctor.deptId;
        if (!resolvedDeptId) throw new Error('Không xác định được chuyên khoa tiếp nhận cho lịch hẹn này.');

        if (await this.hasSpamBooking(patient.phone, patient.id)) {
            throw new Error('Hệ thống ghi nhận Quý khách đang có từ 2 lịch hẹn chờ khám. \nNhằm đảm bảo cơ hội thăm khám cho cộng đồng, vui lòng hoàn tất hoặc hủy lịch cũ trước khi đặt thêm lịch mới.');
        }

        if (await this.hasRecentBookingSpam(patient.phone, patient.id)) {
            throw new Error('Bạn đang thao tác đặt lịch quá nhanh trong thời gian ngắn. Vui lòng chờ ít phút rồi thử lại để hệ thống xác nhận chính xác.');
        }

        if (data.date && data.time) {
            if (this.isTooSoon(data.date, data.time)) {
                throw new Error('Giờ hẹn Quý khách chọn quá sát giờ hiện tại (dưới 2 tiếng). \nĐể Bệnh viện có thể chuẩn bị đón tiếp chu đáo nhất, vui lòng chọn khung giờ khác xa hơn. Trong trường hợp khẩn cấp, vui lòng đến trực tiếp Khoa Cấp Cứu hoặc gọi Hotline 1900 1234.');
            }
        }

        if (data.doctorId && data.date && data.time) {
            if (await this.checkCollision(data.doctorId, data.date, data.time)) {
                throw new Error('Khung giờ này đã nhận đủ số lượng Thăm khám tối đa, nhằm đảm bảo chất lượng phục vụ và tránh quá tải cho Bác sĩ. \nQuý khách vui lòng chọn ca khám hoặc một Bác sĩ khác.');
            }
        }

        const nextId = await db.nextAppointmentId();
        const newAppointment = {
            id: nextId,
            code: data.code || `BK-${Math.floor(1000 + Math.random() * 9000)}`,
            patientId: patient.id,
            patientName: patient.name,
            phone: patient.phone,
            doctorId: parseInt(data.doctorId),
            deptId: resolvedDeptId,
            date: data.date,
            time: data.time,
            status: data.status || 'PENDING',
            symptoms: data.symptoms || '',
            is_emergency: data.is_emergency || false,
            current_department: data.current_department || null,
            vitals: null,
            createdAt: new Date().toISOString(),
            history: [{
                date: new Date().toISOString(),
                action: 'Tạo lịch mới',
                by: data.is_emergency ? 'Hệ thống Cấp cứu' : (user.role === 'PATIENT' ? 'Bệnh nhân' : (user.name || user.role))
            }]
        };

        await db.saveAppointment(newAppointment);

        if (data.doctorId && data.date && data.time) {
            await db.updateScheduleBooked(parseInt(data.doctorId), data.date, data.time, 1);
        }

        return newAppointment;
    }

    async updateStatus(id, status, user) {
        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Không tìm thấy lịch hẹn');
        if (['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(appt.status)) {
            throw new Error(`Không thể cập nhật lịch đang ở trạng thái "${appt.status}".`);
        }

        await this.ensureDeptAccess(appt, user);

        const nextStatus = String(status || '').trim().toUpperCase();
        const role = user.role;

        const isReceptionStep =
            ['ADMIN', 'RECEPTIONIST'].includes(role) &&
            (
                (appt.status === 'PENDING' && ['CONFIRMED', 'ARRIVED'].includes(nextStatus)) ||
                (appt.status === 'CONFIRMED' && nextStatus === 'ARRIVED')
            );

        const isTransferAcceptStep =
            ['ADMIN', 'DOCTOR', 'NURSE'].includes(role) &&
            appt.status === 'TRANSFER_PENDING' &&
            nextStatus === 'READY';

        if (!isReceptionStep && !isTransferAcceptStep) {
            throw new Error('Trạng thái cập nhật không đúng luồng tiếp nhận hiện tại.');
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        const action =
            nextStatus === 'ARRIVED'
                ? 'Lễ tân đã tiếp nhận và chuyển bệnh nhân vào khoa'
                : nextStatus === 'READY' && appt.status === 'TRANSFER_PENDING'
                ? 'Khoa tiếp nhận đã nhận ca chuyển'
                : `Đổi TT -> ${nextStatus}`;
        history.push({
            date: new Date().toISOString(),
            action,
            by: user.name || user.role
        });

        return await db.updateAppointment(parseInt(id), { status: nextStatus, history });
    }

    async updateVitals(id, vitals, user) {
        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Not found');
        await this.ensureDeptAccess(appt, user);

        if (appt.status !== 'ARRIVED') {
            throw new Error('Chỉ có thể đo sinh hiệu sau khi lễ tân đã tiếp nhận bệnh nhân vào khoa.');
        }

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
                recordedBy: user.id ? parseInt(user.id) : null,
            });
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: 'Điều dưỡng đã đo sinh hiệu và chuyển cho bác sĩ',
            by: user.name || user.role
        });

        return await db.updateAppointment(parseInt(id), { status: 'READY', history });
    }

    async completeMedicalRecord(id, record, user) {
        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Not found');
        await this.ensureDeptAccess(appt, user);

        if (appt.status !== 'READY') {
            throw new Error('Bác sĩ chỉ được khám khi điều dưỡng đã đo sinh hiệu và chuyển trạng thái sang sẵn sàng khám.');
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: 'Đã khám & lưu bệnh án',
            by: user.name || user.role
        });

        const updated = await db.updateAppointment(parseInt(id), { status: 'COMPLETED', history });

        if (appt.patientId) {
            await db.appendMedicalHistory(appt.patientId, {
                id: Date.now(),
                date: appt.date,
                doctor: user.name || user.role,
                deptId: record.deptId,
                diagnosis: record.diagnosis,
                prescription: record.prescription,
                notes: record.notes
            });
        }

        return updated;
    }

    async reschedule(id, data, user) {
        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Not found');

        if (['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(appt.status)) {
            throw new Error(`Không thể đổi lịch khi hồ sơ đang ở trạng thái "${appt.status}".`);
        }

        if (!data.doctorId || !data.date || !data.time) {
            throw new Error('Thiếu thông tin bác sĩ hoặc khung giờ cần đổi lịch.');
        }

        if (this.isTooSoon(data.date, data.time)) {
            throw new Error('Khung giờ đổi lịch quá sát giờ hiện tại. Vui lòng chọn khung giờ khác xa hơn.');
        }

        const staffList = await db.getStaff();
        const assignedDoctor = staffList.find(s => s.id === parseInt(data.doctorId) && s.role === 'DOCTOR' && s.isActive);
        if (!assignedDoctor) throw new Error('Bác sĩ được chọn không tồn tại hoặc hiện không hoạt động.');

        if (await this.checkCollision(data.doctorId, data.date, data.time, parseInt(id))) {
            throw new Error('Khung giờ mới của khoa đã đạt giới hạn 5 bệnh nhân.');
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Đổi lịch: ${data.reason}`,
            by: user.name || user.role
        });

        return await db.reassignAppointmentSlot(parseInt(id), {
            doctorId: parseInt(data.doctorId),
            deptId: assignedDoctor.deptId,
            date: data.date,
            time: data.time,
            status: 'CONFIRMED',
            history,
            rescheduledAt: new Date().toISOString(),
            rescheduledBy: user.id || null,
            rescheduledByName: user.name || user.role,
        });
    }

    async cancelAppointment(id, reason, user) {
        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Không tìm thấy lịch hẹn.');

        if (user.role === 'PATIENT') {
            if (appt.patientId !== user.id) {
                throw new Error('Bạn không có quyền hủy lịch của người khác.');
            }
            if (appt.status !== 'PENDING') {
                throw new Error(`Không thể hủy lịch đang ở trạng thái "${appt.status}". Chỉ có thể hủy khi lịch chưa được xác nhận (PENDING).`);
            }
            if (appt.date && appt.time && !this.canCancelByTime(appt.date, appt.time)) {
                throw new Error('Theo quy định, thao tác hủy lịch chỉ được thực hiện trên hệ thống tối thiểu 24 tiếng trước giờ hẹn để bác sĩ sắp xếp lịch trình.\nVui lòng liên hệ bộ phận CSKH qua Hotline 1900 1234 để được hỗ trợ trực tiếp.');
            }
        } else {
             if (appt.status === 'COMPLETED' || appt.status === 'CANCELED' || appt.status === 'NO_SHOW') {
                throw new Error(`Không thể huỷ lịch đang ở trạng thái "${appt.status}".`);
             }
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Đã hủy: ${reason || 'Không rõ lý do'}`,
            by: user.name || user.role
        });

        if (appt.doctorId && appt.date && appt.time && appt.status !== 'CANCELED') {
            await db.updateScheduleBooked(parseInt(appt.doctorId), this.normalizeDate(appt.date), appt.time, -1);
        }

        return await db.updateAppointment(parseInt(id), { status: 'CANCELED', history });
    }

    async markNoShow(id, reason, user) {
        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Không tìm thấy lịch hẹn.');

        if (['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(appt.status)) {
            throw new Error(`Không thể đánh dấu vắng mặt khi lịch đang ở trạng thái "${appt.status}".`);
        }

        if (!appt.date || !appt.time) {
            throw new Error('Không đủ dữ liệu để đánh dấu vắng mặt.');
        }

        const appointmentTime = new Date(`${this.normalizeDate(appt.date)}T${appt.time}:00`);
        const now = new Date();
        const graceMs = 30 * 60 * 1000;
        if (now.getTime() < appointmentTime.getTime() + graceMs) {
            throw new Error('Chỉ có thể đánh dấu vắng mặt sau ít nhất 30 phút kể từ giờ hẹn.');
        }

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Đánh dấu vắng mặt: ${reason || 'Không ghi rõ lý do'}`,
            by: user.name || user.role,
        });

        return db.updateAppointment(parseInt(id), {
            status: 'NO_SHOW',
            history,
            noShowAt: new Date().toISOString(),
            noShowBy: user.id || null,
            noShowByName: user.name || user.role,
            noShowReason: reason || '',
        });
    }

    async transferPatient(id, data, user) {
        const { targetDeptId, reason } = data;
        if (!targetDeptId) throw new Error('Thiếu thông tin khoa tiếp nhận.');

        const appt = await db.findAppointmentById(parseInt(id));
        if (!appt) throw new Error('Không tìm thấy hồ sơ.');

        if (appt.status === 'COMPLETED') {
            throw new Error('Không thể chuyển khoa vì hồ sơ này đã được khám xong và đóng lại.');
        }

        const departments = await db.getDepartments();
        const targetDept = departments.find(d => d.id === parseInt(targetDeptId));
        if (!targetDept) throw new Error('Khoa tiếp nhận không tồn tại.');

        const prevDeptId = appt.current_department || appt.deptId;
        if (prevDeptId && parseInt(targetDeptId) === prevDeptId) {
            throw new Error('Không thể chuyển bệnh nhân vào chính khoa đang điều trị.');
        }

        const prevDeptName = prevDeptId ? (departments.find(d => d.id === prevDeptId)?.name || 'Không rõ') : 'Cấp cứu';

        const history = Array.isArray(appt.history) ? appt.history : [];
        history.push({
            date: new Date().toISOString(),
            action: `Chuyển khoa: ${prevDeptName} → ${targetDept.name}. Lý do: ${reason || 'Không ghi rõ'}`,
            by: user.name || user.role
        });

        const updated = await db.updateAppointment(parseInt(id), {
            current_department: parseInt(targetDeptId),
            deptId: parseInt(targetDeptId),
            status: 'TRANSFER_PENDING',
            history
        });

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
            transferredBy: user.id,
            transferredByName: user.name || user.role,
            transferredAt: new Date().toISOString()
        };
        await db.addEmergencyTransfer(transferRecord);

        return { updated, transferRecord, targetDept };
    }
}

module.exports = new AppointmentService();
