const db = require('../data/db');
const { AppError, sendSuccess, toAppError } = require('../utils/http');

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

function normalizeIncomingDob(dob) {
    if (!dob) return '';

    const raw = String(dob).trim();
    if (!raw) return '';

    const displayMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (displayMatch) {
        return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
    }

    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getEffectiveDeptId(appt, staffList) {
    if (appt.current_department) return parseInt(appt.current_department);
    if (appt.deptId) return parseInt(appt.deptId);

    const assignedDoctor = staffList.find(s => s.id === parseInt(appt.doctorId));
    return assignedDoctor?.deptId ? parseInt(assignedDoctor.deptId) : null;
}

function sanitizePatient(patient) {
    if (!patient) return patient;
    const { password, ...patientWithoutPassword } = patient;
    return patientWithoutPassword;
}

exports.getAllPatients = async (req, res, next) => {
    try {
        const { role, id } = req.user;
        const patients = await db.getPatients();
        let result = patients;

        if (role === 'DOCTOR' || role === 'NURSE') {
            const appointments = await db.getAppointments();
            const staffList = await db.getStaff();
            const currentStaff = staffList.find(s => s.id === parseInt(id));

            if (!currentStaff?.deptId) {
                return sendSuccess(res, []);
            }

            const parsedDeptId = parseInt(currentStaff.deptId);
            const visiblePatients = new Map();

            appointments
                .filter(a => {
                    if (getEffectiveDeptId(a, staffList) !== parsedDeptId) return false;
                    if (role === 'NURSE') return NURSE_VISIBLE_STATUSES.has(a.status);
                    if (role === 'DOCTOR') return DOCTOR_VISIBLE_STATUSES.has(a.status);
                    return true;
                })
                .forEach(a => {
                    const matchedPatient = patients.find(p =>
                        (a.patientId && p.id === a.patientId) ||
                        (a.phone && p.phone === a.phone)
                    );

                    if (matchedPatient) {
                        visiblePatients.set(matchedPatient.id, matchedPatient);
                    }
                });

            result = Array.from(visiblePatients.values());
        }

        result = result
            .map(sanitizePatient)
            .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

        sendSuccess(res, result);
    } catch (err) {
        next(toAppError(err));
    }
};

exports.registerPatient = async (req, res, next) => {
    try {
        const data = req.body;

        const exists = await db.findPatientByPhone(data.phone);
        if (exists) {
            return next(new AppError('Số điện thoại này đã được đăng ký!', 400));
        }

        const nextId = await db.nextPatientId();
        const newPatient = {
            id: nextId,
            patientCode: `BN-${10000 + nextId}`,
            cccd: data.cccd || '',
            name: data.name,
            phone: data.phone,
            email: data.email,
            password: data.password,
            gender: data.gender || 'Unknown',
            dob: normalizeIncomingDob(data.dob),
            address: data.address || '',
            medicalHistory: []
        };

        await db.addPatient(newPatient);
        sendSuccess(res, { user: sanitizePatient(newPatient) }, 'Đăng ký bệnh nhân thành công.', 201);
    } catch (err) {
        next(toAppError(err));
    }
};

exports.getPatientById = async (req, res, next) => {
    try {
        const requestedId = parseInt(req.params.id);
        const requester = req.user;

        if (requester.role === 'PATIENT' && requester.id !== requestedId) {
            return next(new AppError('Bạn không có quyền xem hồ sơ của bệnh nhân khác.', 403));
        }

        const patient = await db.findPatientById(requestedId);
        if (!patient) {
            return next(new AppError('Không tìm thấy bệnh nhân', 404));
        }

        sendSuccess(res, { user: sanitizePatient(patient) });
    } catch (err) {
        next(toAppError(err));
    }
};

exports.updatePatient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cccd, dob, gender } = req.body;
        const requester = req.user;

        if (requester.role === 'PATIENT' && requester.id !== parseInt(id)) {
            return next(new AppError('Bạn không có quyền cập nhật hồ sơ của bệnh nhân khác.', 403));
        }

        const updated = await db.updatePatient(parseInt(id), { cccd, dob: normalizeIncomingDob(dob), gender });
        if (!updated) {
            return next(new AppError('Không tìm thấy bệnh nhân', 404));
        }

        sendSuccess(res, { user: sanitizePatient(updated) }, 'Cập nhật hồ sơ thành công.');
    } catch (err) {
        next(toAppError(err));
    }
};
