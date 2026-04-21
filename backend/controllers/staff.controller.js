const db = require('../data/db');

function sanitizeStaff(staff) {
    if (!staff) return staff;
    const { password, ...staffWithoutPassword } = staff;
    return staffWithoutPassword;
}

// GET /api/staff → ADMIN xem toàn bộ
// BOD chỉ xem nhân sự vận hành trong bệnh viện
exports.getAllStaff = async (req, res) => {
    try {
        const { role } = req.user;
        const staffList = await db.getStaff();

        if (role === 'BOD') {
            const operationalStaff = staffList
                .filter((staff) => ['DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(staff.role))
                .map(sanitizeStaff);
            return res.json(operationalStaff);
        }

        res.json(staffList.map(sanitizeStaff));
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const data = req.body;
        const requester = req.user;
        const staffList = await db.getStaff();

        if (staffList.find(s => s.username === data.username)) {
            return res.status(400).json({ message: 'Username đã tồn tại, vui lòng chọn tên khác!' });
        }

        if (requester.role === 'BOD' && !['DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(data.role)) {
            return res.status(403).json({ message: 'Ban Giám Đốc chỉ được tạo tài khoản vận hành: bác sĩ, điều dưỡng hoặc lễ tân.' });
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
        res.status(201).json(sanitizeStaff(newStaff));
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Phân quyền — BOD không được phép thực hiện
exports.updateStaffRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const updated = await db.updateStaffField(parseInt(id), { role });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(sanitizeStaff(updated));
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

// Kích hoạt/vô hiệu hóa — BOD không được phép
exports.toggleStaffActive = async (req, res) => {
    try {
        const { id } = req.params;
        const requester = req.user;

        const staffList = await db.getStaff();
        const staff = staffList.find(s => s.id === parseInt(id));
        if (!staff) return res.status(404).json({ message: 'Not found' });

        if (requester.id === parseInt(id)) {
            return res.status(400).json({ message: 'Không thể tự khóa hoặc tự mở khóa tài khoản của chính mình.' });
        }

        if (requester.role === 'BOD' && ['ADMIN', 'BOD'].includes(staff.role)) {
            return res.status(403).json({ message: 'Ban Giám Đốc không được khóa/mở khóa tài khoản Admin IT hoặc Ban Giám Đốc.' });
        }

        const updated = await db.updateStaffField(parseInt(id), { isActive: !staff.isActive });
        res.json(sanitizeStaff(updated));
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.updateStaffPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const updated = await db.updateStaffField(parseInt(id), { password: newPassword });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Đổi mật khẩu thành công.', staff: sanitizeStaff(updated) });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};
