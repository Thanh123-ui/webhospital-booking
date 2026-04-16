const db = require('../data/db');

exports.getAllPatients = async (req, res) => {
    try {
        const { role, deptId } = req.query;
        let result = await db.getPatients();

        if (role === 'DOCTOR' && deptId) {
            const parsedDeptId = parseInt(deptId);
            const staffList = await db.getStaff();
            const docIds = staffList
                .filter(s => s.role === 'DOCTOR' && s.deptId === parsedDeptId)
                .map(s => s.id);

            const appointments = await db.getAppointments();
            result = result.filter(p => {
                const history = Array.isArray(p.medicalHistory) ? p.medicalHistory : [];
                const hasHistory = history.some(m => m.deptId === parsedDeptId);
                const hasActiveAppointment = appointments.some(a => a.patientId === p.id && docIds.includes(a.doctorId));
                return hasHistory || hasActiveAppointment;
            });
        }

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
        res.status(201).json({ success: true, user: newPatient });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};

exports.updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { cccd, dob, gender } = req.body;

        const updated = await db.updatePatient(parseInt(id), { cccd, dob, gender });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bệnh nhân' });
        }

        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};
