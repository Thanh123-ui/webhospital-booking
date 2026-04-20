// ─────────────────────────────────────────────────────────────────────────────
// mockData.js — Toàn bộ dữ liệu mẫu (in-memory) cho chế độ DB_MODE=mock
// Không sửa file này; chỉ sửa db.js hoặc thêm dữ liệu tại đây.
// ─────────────────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const hash = (pass) => bcrypt.hashSync(pass, 10);

const mockDepartments = [
  { id: 1, name: 'Tim mạch',  desc: 'Tầm soát, chẩn đoán và điều trị chuyên sâu các bệnh lý tim mạch.',       iconRef: 'HeartPulse',  color: 'red'    },
  { id: 2, name: 'Nhi khoa',  desc: 'Chăm sóc sức khỏe toàn diện cho trẻ sơ sinh, trẻ nhỏ và vị thành niên.', iconRef: 'Activity',    color: 'blue'   },
  { id: 3, name: 'Nha khoa',  desc: 'Khám, nhổ răng, phục hình thẩm mỹ và chăm sóc răng miệng.',               iconRef: 'Stethoscope', color: 'teal'   },
  { id: 4, name: 'Thần kinh', desc: 'Khám và điều trị các bệnh lý về não, tủy sống và dây thần kinh.',         iconRef: 'Brain',       color: 'purple' },
  { id: 5, name: 'Cấp cứu',   desc: 'Tiếp nhận và xử lý các trường hợp cấp cứu, chuyển viện và phân luồng.', iconRef: 'Ambulance',   color: 'orange', isEmergency: true },
];

const mockDoctors = [
  { id:  1, deptId: 1, name: 'BS. Trần Văn Tim',   title: 'Tiến sĩ, BS CKI',           avatar: '👨‍⚕️', exp: '15 năm', username: 'bstim',    password: hash('bstim@2024')    },
  { id:  2, deptId: 2, name: 'BS. Nguyễn Thị Bé',  title: 'Thạc sĩ',                   avatar: '👩‍⚕️', exp: '10 năm', username: 'bsbe',     password: hash('bsbe@2024')     },
  { id:  3, deptId: 3, name: 'BS. Lê Răng Sứ',     title: 'BS Răng Hàm Mặt',           avatar: '👨‍⚕️', exp: '8 năm',  username: 'bssu',     password: hash('bssu@2024')     },
  { id:  4, deptId: 4, name: 'BS. Phạm Não',        title: 'PGS. TS. Bác sĩ',           avatar: '👨‍⚕️', exp: '20 năm', username: 'bsnao',    password: hash('bsnao@2024')    },
  { id: 11, deptId: 5, name: 'BS. Lê Văn Cấp',     title: 'BS Cấp cứu - Hồi sức',      avatar: '🧑‍⚕️', exp: '12 năm', username: 'bscap',    password: hash('bscap@2024')    },
  { id: 13, deptId: 1, name: 'BS. Hoàng Mạch',     title: 'Thạc sĩ',                   avatar: '👨‍⚕️', exp: '5 năm',  username: 'bsmach',   password: hash('bsmach@2024')   },
  { id: 14, deptId: 2, name: 'BS. Trương Đồng',    title: 'Bác sĩ Nhi Khoa',           avatar: '👩‍⚕️', exp: '7 năm',  username: 'bsdong',   password: hash('bsdong@2024')   },
  { id: 15, deptId: 3, name: 'BS. Đào Nha',        title: 'BS Răng Hàm Mặt',           avatar: '👨‍⚕️', exp: '6 năm',  username: 'bsnha',    password: hash('bsnha@2024')    },
  { id: 16, deptId: 4, name: 'BS. Ninh Tủy',       title: 'Tiến sĩ, Bác sĩ',           avatar: '👨‍⚕️', exp: '11 năm', username: 'bstuy',    password: hash('bstuy@2024')    },
  { id: 17, deptId: 5, name: 'BS. Đỗ Trọng',       title: 'BS Cấp cứu',                avatar: '👨‍⚕️', exp: '9 năm',  username: 'bstrong',  password: hash('bstrong@2024')  },
];

const initialStaff = [
  ...mockDoctors.map(d => ({ ...d, role: 'DOCTOR', isActive: true })),
  { id:  5, deptId: 1,    name: 'ĐD. Trần Thị An',    title: 'Điều dưỡng trưởng Khoa Tim Mạch', avatar: '👩‍⚕️', role: 'NURSE',        isActive: true,  username: 'nurse',      password: hash('123')          },
  { id:  6, deptId: null, name: 'Nguyễn Văn IT',       title: 'Quản trị hệ thống (IT)',          avatar: '🧑‍💻', role: 'ADMIN',        isActive: true,  username: 'admin',      password: hash('123')          },
  { id:  7, deptId: null, name: 'Giám đốc Lê Văn C',   title: 'Tổng Giám Đốc',                  avatar: '👔',   role: 'BOD',          isActive: true,  username: 'bod',        password: hash('123')          },
  { id:  8, deptId: null, name: 'Trần Thị Duyên',      title: 'Trưởng bộ phận tiếp đón',        avatar: '👩‍💼', role: 'RECEPTIONIST', isActive: true,  username: 'reception',  password: hash('123')          },
  { id:  9, deptId: 1,    name: 'BS. Hoàng Đã Nghỉ',   title: 'Bác sĩ cũ',                      avatar: '👨‍⚕️', role: 'DOCTOR',       isActive: false, username: 'bsnghi',     password: hash('bsnghi@2024')  },
  { id: 10, deptId: 1,    name: 'BS. Nguyễn Văn A',    title: 'Bác sĩ chuyên khoa Tim Mạch',    avatar: '👨‍⚕️', role: 'DOCTOR',       isActive: true,  username: 'nva',        password: hash('nva@2024')     },
  { id: 12, deptId: 5,    name: 'ĐD. Phạm Thị Nhanh',  title: 'Điều dưỡng Cấp cứu',             avatar: '👩‍⚕️', role: 'NURSE',        isActive: true,  username: 'nursecap',   password: hash('nurse@2024')   },
];

const initialPatients = [
  {
    id: 1, patientCode: 'BN-10001', cccd: '079012345678',
    name: 'Nguyễn Văn A', phone: '0901234567', email: 'nguyenvana@gmail.com',
    password: hash('pass@2024'), gender: 'Nam', dob: '1980-05-12', address: 'Quận 1, TP.HCM',
    medicalHistory: [
      { id: 1, date: '2023-10-15', doctor: 'BS. Nguyễn Văn A', deptId: 1, diagnosis: 'Tăng huyết áp vô căn (Tim mạch)', prescription: 'Amlodipine 5mg x 30 viên', notes: 'Hẹn tái khám sau 1 tháng' },
      { id: 2, date: '2023-11-20', doctor: 'BS. Nguyễn Thị Bé', deptId: 2, diagnosis: 'Sốt siêu vi (Nhi khoa)', prescription: 'Paracetamol 500mg', notes: 'Uống nhiều nước' },
    ],
  },
  {
    id: 2, patientCode: 'BN-10002', cccd: '079088888888',
    name: 'Trần Thị B', phone: '0988888888', email: 'tranthib@gmail.com',
    password: hash('pass@2025'), gender: 'Nữ', dob: '1995-08-20', address: 'Quận 3, TP.HCM',
    medicalHistory: [
      { id: 3, date: '2023-11-01', doctor: 'BS. Nguyễn Thị Bé', deptId: 2, diagnosis: 'Sốt siêu vi', prescription: 'Paracetamol 500mg', notes: 'Uống nhiều nước' },
    ],
  },
];

/**
 * POLICY C — Sinh slot thời gian chuẩn: mỗi ca 30 phút, nghỉ 5 phút giữa các ca.
 * Ca sáng : 07:00 → 11:35  (8 slots)
 * Ca chiều: 13:00 → 16:30  (7 slots)
 */
function generateStandardSlots() {
  const slots = [];
  const push = (startMin, count) => {
    for (let i = 0; i < count; i++) {
      const m = startMin + i * 35;
      slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
  };
  push(7 * 60, 8);   // sáng
  push(13 * 60, 7);  // chiều
  return slots;
}

const STANDARD_SLOTS = generateStandardSlots();

function generateMockSchedules() {
  const schedules = [];
  let id = 1;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    mockDoctors.forEach(doc => {
      STANDARD_SLOTS.forEach(time => {
        if (Math.random() > 0.1) {
          schedules.push({ id: id++, doctorId: doc.id, date: dateStr, time, maxPatients: 2, booked: Math.floor(Math.random() * 2) });
        }
      });
    });
  }
  return schedules;
}

const initialAppointments = [
  {
    id: 1, code: 'BK-1001', patientId: 1,
    patientName: 'Nguyễn Văn A', phone: '0901234567',
    doctorId: 1, deptId: 1,
    date: new Date().toISOString().split('T')[0], time: '07:00',
    status: 'PENDING', is_emergency: false, current_department: null, history: [],
    symptoms: 'Đau ngực, khó thở nhẹ',
  },
];

module.exports = {
  mockDepartments,
  mockDoctors,
  initialStaff,
  initialPatients,
  initialAppointments,
  generateMockSchedules,
  STANDARD_SLOTS,
};
