const db = require('../data/db');

exports.getAllStaff = (req, res) => {
    res.json(db.staffList);
};

exports.addStaff = (req, res) => {
    const data = req.body;

    if (db.staffList.find(s => s.username === data.username)) {
        return res.status(400).json({ message: 'Username đã tồn tại, vui lòng chọn tên khác!' });
    }

    const avatarMap = { BOD: '👔', DOCTOR: '👨‍⚕️', NURSE: '👩‍⚕️', RECEPTIONIST: '👩‍💼', ADMIN: '🧑‍💻' };

    const newStaff = {
        id: db.staffList.length + 1,
        name: data.name,
        role: data.role,
        title: data.title,
        deptId: (data.role === 'DOCTOR' || data.role === 'NURSE') ? parseInt(data.deptId) : null,
        avatar: avatarMap[data.role] || '👤',
        isActive: true,
        username: data.username,
        password: data.password || '123'
    };

    db.staffList.push(newStaff);
    res.status(201).json(newStaff);
};


exports.updateStaffRole = (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    const staff = db.staffList.find(s => s.id === parseInt(id));
    if(staff) {
        staff.role = role;
        res.json(staff);
    } else {
        res.status(404).json({message: 'Not found'});
    }
};

exports.toggleStaffActive = (req, res) => {
    const { id } = req.params;
    
    const staff = db.staffList.find(s => s.id === parseInt(id));
    if(staff) {
        staff.isActive = !staff.isActive;
        res.json(staff);
    } else {
        res.status(404).json({message: 'Not found'});
    }
};
