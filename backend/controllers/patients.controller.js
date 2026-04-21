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

exports.getAllPatients = async (req, res) => {
    try {
        const { role, id } = req.user;
        const patients = await db.getPatients();
        let result = patients;

        if (role === 'DOCTOR' || role === 'NURSE') {
            const appointments = await db.getAppointments();
            const staffList = await db.getStaff();
            const currentStaff = staffList.find(s => s.id === parseInt(id));

            if (!currentStaff?.deptId) {
                return res.json([]);
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

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.registerPatient = async (req, res) => {
    try {
        const data = req.body;

        const exists = await db.findPatientByPhone(data.phone);
        if (exists) {
            return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký!' });
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
            dob: data.dob || '',
            address: data.address || '',
            medicalHistory: []
        };

        await db.addPatient(newPatient);
        res.status(201).json({ success: true, user: sanitizePatient(newPatient) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const requestedId = parseInt(req.params.id);
        const requester = req.user;

        if (requester.role === 'PATIENT' && requester.id !== requestedId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hồ sơ của bệnh nhân khác.' });
        }

        const patient = await db.findPatientById(requestedId);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bệnh nhân' });
        }

        res.json({ success: true, user: sanitizePatient(patient) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { cccd, dob, gender } = req.body;
        const requester = req.user;

        if (requester.role === 'PATIENT' && requester.id !== parseInt(id)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật hồ sơ của bệnh nhân khác.' });
        }

        const updated = await db.updatePatient(parseInt(id), { cccd, dob, gender });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bệnh nhân' });
        }

        res.json({ success: true, user: sanitizePatient(updated) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};
