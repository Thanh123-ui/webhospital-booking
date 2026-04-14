const db = require('../data/db');

exports.getAllPatients = (req, res) => {
    const { role, deptId } = req.query;
    let result = db.patientsList;
    
    if (role === 'DOCTOR' && deptId) {
        const parsedDeptId = parseInt(deptId);
        const docIds = db.staffList.filter(s => s.role === 'DOCTOR' && s.deptId === parsedDeptId).map(s => s.id);
        
        result = result.filter(p => {
             const hasHistory = p.medicalHistory.some(m => m.deptId === parsedDeptId);
             const hasActiveAppointment = db.appointmentsList.some(a => a.patientId === p.id && docIds.includes(a.doctorId));
             return hasHistory || hasActiveAppointment;
        });
    }
    
    res.json(result);
};

exports.registerPatient = (req, res) => {
    const data = req.body;
    
    const exists = db.patientsList.find(p => p.phone === data.phone);
    if (exists) {
        return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký!' });
    }

    const newPatient = { 
        id: db.patientsList.length + 1, 
        patientCode: `BN-${10000 + db.patientsList.length + 1}`,
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

    db.patientsList.push(newPatient);
    res.status(201).json({ success: true, user: newPatient });
};

exports.updatePatient = (req, res) => {
    const { id } = req.params;
    const { cccd, dob, gender } = req.body;

    const patientIndex = db.patientsList.findIndex(p => p.id === parseInt(id));
    if (patientIndex === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bệnh nhân' });
    }

    if (cccd !== undefined) db.patientsList[patientIndex].cccd = cccd;
    if (dob !== undefined) db.patientsList[patientIndex].dob = dob;
    if (gender !== undefined) db.patientsList[patientIndex].gender = gender;

    res.json({ success: true, user: db.patientsList[patientIndex] });
};
