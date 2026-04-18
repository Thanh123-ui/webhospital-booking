const db = require('../data/db');

// GET /api/staff?role=BOD  → BOD chỉ xem danh sách bác sĩ (DOCTOR), không được phân quyền
// GET /api/staff            → Admin/RECEPTIONIST xem toàn bộ
exports.getAllStaff = async (req, res) => {
    try {
        const { role } = req.query;
        const staffList = await db.getStaff();

        // Ban Giám Đốc: chỉ thấy danh sách bác sĩ (DOCTOR) đang chạy, không thấy admin/system accounts
        if (role === 'BOD') {
            const doctors = staffList.filter(s => s.role === 'DOCTOR' && s.isActive === true);
            return res.json(doctors);
        }

        res.json(staffList);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const data = req.body;
        const staffList = await db.getStaff();

        if (staffList.find(s => s.username === data.username)) {
            return res.status(400).json({ message: 'Username đã tồn tại, vui lòng chọn tên khác!' });
        }

        const avatarMap = { BOD: '👔', DOCTOR: '👨‍⚕️', NURSE: '👩‍⚕️', RECEPTIONIST: '👩‍💼', ADMIN: '🧑‍💻' };

        const parsedDeptId = (data.deptId && !isNaN(parseInt(data.deptId))) ? parseInt(data.deptId) : null;
        if ((data.role === 'DOCTOR' || data.role === 'NURSE') && !parsedDeptId) {
            return res.status(400).json({ message: 'Vui lòng chọn Khoa/Chuyên khoa cho Bác sĩ hoặc Điều dưỡng.' });
        }

        const nextId = await db.nextStaffId();
        const newStaff = {
            id: nextId,
            name: data.name,
            role: data.role,
            title: data.title,
            exp: data.exp || null,
            deptId: (data.role === 'DOCTOR' || data.role === 'NURSE') ? parsedDeptId : null,
            avatar: avatarMap[data.role] || '👤',
            isActive: true,
            username: data.username,
            password: data.password || '123'
        };

        await db.addStaff(newStaff);
        res.status(201).json(newStaff);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Phân quyền — BOD không được phép thực hiện
exports.updateStaffRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, requesterRole } = req.body;

        // BOD không có quyền thay đổi role
        if (requesterRole === 'BOD') {
            return res.status(403).json({ message: 'Ban Giám Đốc không có quyền phân quyền nhân viên. Vui lòng liên hệ Admin.' });
        }

        const updated = await db.updateStaffField(parseInt(id), { role });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Kích hoạt/vô hiệu hóa — BOD không được phép
exports.toggleStaffActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { requesterRole } = req.body;

        // BOD không có quyền bật/tắt nhân viên
        if (requesterRole === 'BOD') {
            return res.status(403).json({ message: 'Ban Giám Đốc không có quyền vô hiệu hóa nhân viên. Vui lòng liên hệ Admin.' });
        }

        const staffList = await db.getStaff();
        const staff = staffList.find(s => s.id === parseInt(id));
        if (!staff) return res.status(404).json({ message: 'Not found' });

        const updated = await db.updateStaffField(parseInt(id), { isActive: !staff.isActive });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.updateStaffPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword, requesterRole } = req.body;

        if (requesterRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Chỉ Admin hệ thống mới có quyền Reset Mật khẩu.' });
        }

        const updated = await db.updateStaffField(parseInt(id), { password: newPassword });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Đổi mật khẩu thành công.', staff: updated });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};
