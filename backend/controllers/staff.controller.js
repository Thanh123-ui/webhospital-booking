const db = require('../data/db');

// GET /api/staff?role=BOD  → BOD chỉ xem danh sách bác sĩ (DOCTOR), không được phân quyền
// GET /api/staff            → Admin/RECEPTIONIST xem toàn bộ
exports.getAllStaff = (req, res) => {
    const { role } = req.query;

    // Ban Giám Đốc: chỉ thấy danh sách bác sĩ (DOCTOR), không thấy admin/system accounts
    if (role === 'BOD') {
        const doctors = db.staffList.filter(s => s.role === 'DOCTOR');
        return res.json(doctors);
    }

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

// Phân quyền — BOD không được phép thực hiện
exports.updateStaffRole = (req, res) => {
    const { id } = req.params;
    const { role, requesterRole } = req.body;

    // BOD không có quyền thay đổi role
    if (requesterRole === 'BOD') {
        return res.status(403).json({ message: 'Ban Giám Đốc không có quyền phân quyền nhân viên. Vui lòng liên hệ Admin.' });
    }

    const staff = db.staffList.find(s => s.id === parseInt(id));
    if (staff) {
        staff.role = role;
        res.json(staff);
    } else {
        res.status(404).json({ message: 'Not found' });
    }
};

// Kích hoạt/vô hiệu hóa — BOD không được phép
exports.toggleStaffActive = (req, res) => {
    const { id } = req.params;
    const { requesterRole } = req.body;

    // BOD không có quyền bật/tắt nhân viên
    if (requesterRole === 'BOD') {
        return res.status(403).json({ message: 'Ban Giám Đốc không có quyền vô hiệu hóa nhân viên. Vui lòng liên hệ Admin.' });
    }

    const staff = db.staffList.find(s => s.id === parseInt(id));
    if (staff) {
        staff.isActive = !staff.isActive;
        res.json(staff);
    } else {
        res.status(404).json({ message: 'Not found' });
    }
};
