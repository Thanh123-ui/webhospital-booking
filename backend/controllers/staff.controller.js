const db = require('../data/db');
const { AppError, sendSuccess, toAppError } = require('../utils/http');

function sanitizeStaff(staff) {
    if (!staff) return staff;
    const { password, ...staffWithoutPassword } = staff;
    return staffWithoutPassword;
}

// GET /api/staff → ADMIN xem toàn bộ
// BOD chỉ xem nhân sự vận hành trong bệnh viện
exports.getAllStaff = async (req, res, next) => {
    try {
        const { role } = req.user;
        const staffList = await db.getStaff();

        if (role === 'BOD') {
            const operationalStaff = staffList
                .filter((staff) => ['DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(staff.role))
                .map(sanitizeStaff);
            return sendSuccess(res, operationalStaff);
        }

        sendSuccess(res, staffList.map(sanitizeStaff));
    } catch (err) {
        next(toAppError(err));
    }
};

exports.addStaff = async (req, res, next) => {
    try {
        const data = req.body;
        const requester = req.user;
        const staffList = await db.getStaff();

        if (staffList.find(s => s.username === data.username)) {
            return next(new AppError('Username đã tồn tại, vui lòng chọn tên khác!', 400));
        }

        if (requester.role === 'BOD' && !['DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(data.role)) {
            return next(new AppError('Ban Giám Đốc chỉ được tạo tài khoản vận hành: bác sĩ, điều dưỡng hoặc lễ tân.', 403));
        }

        const avatarMap = { BOD: '👔', DOCTOR: '👨‍⚕️', NURSE: '👩‍⚕️', RECEPTIONIST: '👩‍💼', ADMIN: '🧑‍💻' };

        const parsedDeptId = (data.deptId && !isNaN(parseInt(data.deptId))) ? parseInt(data.deptId) : null;
        if ((data.role === 'DOCTOR' || data.role === 'NURSE') && !parsedDeptId) {
            return next(new AppError('Vui lòng chọn Khoa/Chuyên khoa cho Bác sĩ hoặc Điều dưỡng.', 400));
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
        sendSuccess(res, sanitizeStaff(newStaff), 'Tạo tài khoản nhân sự thành công.', 201);
    } catch (err) {
        next(toAppError(err));
    }
};

// Phân quyền — BOD không được phép thực hiện
exports.updateStaffRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const updated = await db.updateStaffField(parseInt(id), { role });
        if (!updated) return next(new AppError('Not found', 404));
        sendSuccess(res, sanitizeStaff(updated), 'Cập nhật vai trò thành công.');
    } catch (err) {
        next(toAppError(err));
    }
};

// Kích hoạt/vô hiệu hóa — BOD không được phép
exports.toggleStaffActive = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requester = req.user;

        const staffList = await db.getStaff();
        const staff = staffList.find(s => s.id === parseInt(id));
        if (!staff) return next(new AppError('Not found', 404));

        if (requester.id === parseInt(id)) {
            return next(new AppError('Không thể tự khóa hoặc tự mở khóa tài khoản của chính mình.', 400));
        }

        if (requester.role === 'BOD' && ['ADMIN', 'BOD'].includes(staff.role)) {
            return next(new AppError('Ban Giám Đốc không được khóa/mở khóa tài khoản Admin IT hoặc Ban Giám Đốc.', 403));
        }

        const updated = await db.updateStaffField(parseInt(id), { isActive: !staff.isActive });
        sendSuccess(res, sanitizeStaff(updated), 'Cập nhật trạng thái nhân sự thành công.');
    } catch (err) {
        next(toAppError(err));
    }
};

exports.updateStaffPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        const updated = await db.updateStaffField(parseInt(id), { password: newPassword });
        if (!updated) return next(new AppError('Not found', 404));
        sendSuccess(res, { staff: sanitizeStaff(updated) }, 'Đổi mật khẩu thành công.');
    } catch (err) {
        next(toAppError(err));
    }
};
