const mockDepartments = [
  { id: 1, name: 'Tim mạch', desc: 'Tầm soát, chẩn đoán và điều trị chuyên sâu các bệnh lý tim mạch.', iconRef: 'HeartPulse', color: 'red' },
  { id: 2, name: 'Nhi khoa', desc: 'Chăm sóc sức khỏe toàn diện cho trẻ sơ sinh, trẻ nhỏ và vị thành niên.', iconRef: 'Activity', color: 'blue' },
  { id: 3, name: 'Nha khoa', desc: 'Khám, nhổ răng, phục hình thẩm mỹ và chăm sóc răng miệng.', iconRef: 'Stethoscope', color: 'teal' },
  { id: 4, name: 'Thần kinh', desc: 'Khám và điều trị các bệnh lý về não, tủy sống và dây thần kinh.', iconRef: 'Brain', color: 'purple' },
  { id: 5, name: 'Cấp cứu', desc: 'Tiếp nhận và xử lý các trường hợp cấp cứu, chuyển viện và phân luồng khoa chuyên môn.', iconRef: 'Ambulance', color: 'orange', isEmergency: true },
];

const mockDoctors = [
  { id: 1, deptId: 1, name: 'BS. Trần Văn Tim', title: 'Tiến sĩ, BS CKI', avatar: '👨‍⚕️', exp: '15 năm', username: 'bstim', password: 'bstim@2024' },
  { id: 2, deptId: 2, name: 'BS. Nguyễn Thị Bé', title: 'Thạc sĩ', avatar: '👩‍⚕️', exp: '10 năm', username: 'bsbe', password: 'bsbe@2024' },
  { id: 3, deptId: 3, name: 'BS. Lê Răng Sứ', title: 'BS Răng Hàm Mặt', avatar: '👨‍⚕️', exp: '8 năm', username: 'bssu', password: 'bssu@2024' },
  { id: 4, deptId: 4, name: 'BS. Phạm Não', title: 'PGS. TS. Bác sĩ', avatar: '👨‍⚕️', exp: '20 năm', username: 'bsnao', password: 'bsnao@2024' },
  { id: 11, deptId: 5, name: 'BS. Lê Văn Cấp', title: 'BS Cấp cứu - Hồi sức tích cực', avatar: '🧑‍⚕️', exp: '12 năm', username: 'bscap', password: 'bscap@2024' },
];

const initialStaff = [
  ...mockDoctors.map(d => ({ ...d, role: 'DOCTOR', isActive: true })),
  // Điều dưỡng - có deptId để biết thuộc khoa nào
  { id: 5, deptId: 1, name: 'ĐD. Trần Thị An', title: 'Điều dưỡng trưởng Khoa Tim Mạch', avatar: '👩‍⚕️', role: 'NURSE', isActive: true, username: 'nurse', password: '123' },
  // Admin IT
  { id: 6, deptId: null, name: 'Nguyễn Văn IT', title: 'Quản trị hệ thống (IT)', avatar: '🧑‍💻', role: 'ADMIN', isActive: true, username: 'admin', password: '123' },
  // Ban Giám Đốc 
  { id: 7, deptId: null, name: 'Giám đốc Lê Văn C', title: 'Tổng Giám Đốc', avatar: '👔', role: 'BOD', isActive: true, username: 'bod', password: '123' },
  // Lễ tân
  { id: 8, deptId: null, name: 'Trần Thị Duyên', title: 'Trưởng bộ phận tiếp đón', avatar: '👩‍💼', role: 'RECEPTIONIST', isActive: true, username: 'reception', password: '123' },
  // Inactive
  { id: 9, deptId: 1, name: 'BS. Hoàng Đã Nghỉ', title: 'Bác sĩ cũ', avatar: '👨‍⚕️', role: 'DOCTOR', isActive: false, username: 'bsnghi', password: 'bsnghi@2024' },
  { id: 10, deptId: 1, name: 'BS. Nguyễn Văn A', title: 'Bác sĩ chuyên khoa Tim Mạch', avatar: '👨‍⚕️', role: 'DOCTOR', isActive: true, username: 'nva', password: 'nva@2024' },
  // Khoa Cấp cứu
  { id: 12, deptId: 5, name: 'ĐD. Phạm Thị Nhanh', title: 'Điều dưỡng Cấp cứu', avatar: '👩‍⚕️', role: 'NURSE', isActive: true, username: 'nursecap', password: 'nurse@2024' },
];

const initialPatients = [
  { id: 1, patientCode: 'BN-10001', cccd: '079012345678', name: 'Nguyễn Văn A', phone: '0901234567', email: 'nguyenvana@gmail.com', password: 'pass@2024', gender: 'Nam', dob: '1980-05-12', address: 'Quận 1, TP.HCM', medicalHistory: [
    { id: 1, date: '2023-10-15', doctor: 'BS. Nguyễn Văn A', deptId: 1, diagnosis: 'Tăng huyết áp vô căn (Tim mạch)', prescription: 'Amlodipine 5mg x 30 viên', notes: 'Hẹn tái khám sau 1 tháng' },
    { id: 2, date: '2023-11-20', doctor: 'BS. Nguyễn Thị Bé', deptId: 2, diagnosis: 'Sốt siêu vi (Nhi khoa)', prescription: 'Paracetamol 500mg', notes: 'Uống nhiều nước' }
  ]},
  { id: 2, patientCode: 'BN-10002', cccd: '079088888888', name: 'Trần Thị B', phone: '0988888888', email: 'tranthib@gmail.com', password: 'pass@2025', gender: 'Nữ', dob: '1995-08-20', address: 'Quận 3, TP.HCM', medicalHistory: [
    { id: 3, date: '2023-11-01', doctor: 'BS. Nguyễn Thị Bé', deptId: 2, diagnosis: 'Sốt siêu vi', prescription: 'Paracetamol 500mg', notes: 'Uống nhiều nước' }
  ]}
];

const generateMockSchedules = () => {
  const schedules = [];
  let idCounter = 1;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    mockDoctors.forEach(doc => {
      ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '18:00', '20:00'].forEach(time => {
        if (Math.random() > 0.1) {
          schedules.push({ id: idCounter++, doctorId: doc.id, date: dateStr, time: time, maxPatients: 2, booked: Math.floor(Math.random() * 2) });
        }
      });
    });
  }
  return schedules;
};

// Global Memory State for simulation
let schedules = generateMockSchedules();
let staffList = [...initialStaff];
let patientsList = [...initialPatients];
let appointmentsList = [
    {
        id: 1,
        code: 'BK-1001',
        patientId: 1,
        patientName: 'Nguyễn Văn A',
        phone: '0901234567',
        doctorId: 1,
        deptId: 1,
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        status: 'PENDING',
        is_emergency: false,
        current_department: null,
        history: []
    }
];
let logsList = [];
let ratingsList = [];

// Danh sách lịch sử chuyển hồ sơ cấp cứu
let emergencyTransfers = [];

module.exports = {
  mockDepartments,
  mockDoctors,
  schedules,
  staffList,
  patientsList,
  appointmentsList,
  logsList,
  ratingsList,
  emergencyTransfers
};
