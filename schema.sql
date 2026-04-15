-- ==============================================================================
-- BỆNH VIỆN WEB BOOKING - DATABASE SCHEMA & INITIAL DATA
-- Chạy tự động bởi EC2 user-data khi khởi tạo database AWS RDS
-- ==============================================================================

-- Bật sử dụng database (nếu chưa chọn) và set UTF-8
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1. BẢNG CHUYÊN KHOA
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  `desc` TEXT,
  iconRef VARCHAR(50),
  color VARCHAR(30),
  isEmergency BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG NHÂN VIÊN / BÁC SĨ (STAFF)
CREATE TABLE IF NOT EXISTS staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deptId INT NULL,
  name VARCHAR(150) NOT NULL,
  title VARCHAR(150),
  avatar VARCHAR(10),
  exp VARCHAR(50),
  role VARCHAR(50) DEFAULT 'DOCTOR', -- DOCTOR, NURSE, ADMIN, BOD, RECEPTIONIST
  isActive BOOLEAN DEFAULT TRUE,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,    -- Trong thực tế nên đổi thành chuỗi đã băm (hash)
  FOREIGN KEY (deptId) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG BỆNH NHÂN
CREATE TABLE IF NOT EXISTS patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientCode VARCHAR(20) UNIQUE,
  cccd VARCHAR(20),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(150),
  password VARCHAR(255) NOT NULL,
  gender VARCHAR(10),
  dob DATE,
  address TEXT,
  medicalHistory JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG LỊCH HẸN
CREATE TABLE IF NOT EXISTS appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  patientId INT,
  patientName VARCHAR(150),
  phone VARCHAR(20),
  doctorId INT,
  deptId INT,
  `date` DATE,
  `time` VARCHAR(10),
  status VARCHAR(50) DEFAULT 'PENDING',
  symptoms TEXT,
  is_emergency BOOLEAN DEFAULT FALSE,
  current_department INT NULL,
  vitals JSON,
  history JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (doctorId) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (deptId) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (current_department) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG LỊCH LÀM VIỆC CỦA BÁC SĨ (SCHEDULES)
CREATE TABLE IF NOT EXISTS schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doctorId INT NOT NULL,
  `date` DATE NOT NULL,
  `time` VARCHAR(10) NOT NULL,
  maxPatients INT DEFAULT 2,
  booked INT DEFAULT 0,
  FOREIGN KEY (doctorId) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG LỊCH SỬ CHUYỂN KHOA CẤP CỨU
CREATE TABLE IF NOT EXISTS emergency_transfers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  appointmentId INT,
  appointmentCode VARCHAR(20),
  patientId INT,
  patientName VARCHAR(150),
  fromDeptId INT NULL,
  fromDeptName VARCHAR(100),
  toDeptId INT,
  toDeptName VARCHAR(100),
  reason TEXT,
  transferredBy INT,
  transferredByName VARCHAR(150),
  transferredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG LƯU LOGS HỆ THỐNG
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action TEXT NOT NULL,
  `by` VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- INSERT DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ==============================================================================

-- Insert Departments
INSERT IGNORE INTO departments (id, name, `desc`, iconRef, color, isEmergency) VALUES
(1, 'Tim mạch',  'Tầm soát, chẩn đoán và điều trị chuyên sâu các bệnh lý tim mạch.', 'HeartPulse', 'red', FALSE),
(2, 'Nhi khoa',  'Chăm sóc sức khỏe toàn diện cho trẻ sơ sinh, trẻ nhỏ và vị thành niên.', 'Activity', 'blue', FALSE),
(3, 'Nha khoa',  'Khám, nhổ răng, phục hình thẩm mỹ và chăm sóc răng miệng.', 'Stethoscope', 'teal', FALSE),
(4, 'Thần kinh', 'Khám và điều trị các bệnh lý về não, tủy sống và dây thần kinh.', 'Brain', 'purple', FALSE),
(5, 'Cấp cứu',   'Tiếp nhận và xử lý các trường hợp cấp cứu, chuyển viện và phân luồng.', 'Ambulance', 'orange', TRUE);

-- Insert Staff (Báo sĩ, Điều dưỡng, Admin, BOD, Lễ tân)
INSERT IGNORE INTO staff (id, deptId, name, title, avatar, exp, role, isActive, username, password) VALUES
(1,  1,    'BS. Trần Văn Tim',   'Tiến sĩ, BS CKI',           '👨‍⚕️', '15 năm', 'DOCTOR',       TRUE,  'bstim',      'bstim@2024'),
(2,  2,    'BS. Nguyễn Thị Bé',  'Thạc sĩ',                   '👩‍⚕️', '10 năm', 'DOCTOR',       TRUE,  'bsbe',       'bsbe@2024'),
(3,  3,    'BS. Lê Răng Sứ',     'BS Răng Hàm Mặt',           '👨‍⚕️', '8 năm',  'DOCTOR',       TRUE,  'bssu',       'bssu@2024'),
(4,  4,    'BS. Phạm Não',       'PGS. TS. Bác sĩ',           '👨‍⚕️', '20 năm', 'DOCTOR',       TRUE,  'bsnao',      'bsnao@2024'),
(11, 5,    'BS. Lê Văn Cấp',     'BS Cấp cứu - Hồi sức',      '🧑‍⚕️', '12 năm', 'DOCTOR',       TRUE,  'bscap',      'bscap@2024'),
(13, 1,    'BS. Hoàng Mạch',     'Thạc sĩ',                   '👨‍⚕️', '5 năm',  'DOCTOR',       TRUE,  'bsmach',     'bsmach@2024'),
(14, 2,    'BS. Trương Đồng',    'Bác sĩ Nhi Khoa',           '👩‍⚕️', '7 năm',  'DOCTOR',       TRUE,  'bsdong',     'bsdong@2024'),
(15, 3,    'BS. Đào Nha',        'BS Răng Hàm Mặt',           '👨‍⚕️', '6 năm',  'DOCTOR',       TRUE,  'bsnha',      'bsnha@2024'),
(16, 4,    'BS. Ninh Tủy',       'Tiến sĩ, Bác sĩ',           '👨‍⚕️', '11 năm', 'DOCTOR',       TRUE,  'bstuy',      'bstuy@2024'),
(17, 5,    'BS. Đỗ Trọng',       'BS Cấp cứu',                '👨‍⚕️', '9 năm',  'DOCTOR',       TRUE,  'bstrong',    'bstrong@2024'),
(5,  1,    'ĐD. Trần Thị An',    'Điều dưỡng trưởng Tim Mạch','👩‍⚕️', NULL,     'NURSE',        TRUE,  'nurse',      '123'),
(6,  NULL, 'Nguyễn Văn IT',      'Quản trị hệ thống (IT)',    '🧑‍💻', NULL,     'ADMIN',        TRUE,  'admin',      '123'),
(7,  NULL, 'Giám đốc Lê Văn C',  'Tổng Giám Đốc',             '👔', NULL,     'BOD',          TRUE,  'bod',        '123'),
(8,  NULL, 'Trần Thị Duyên',     'Trưởng bộ phận tiếp đón',   '👩‍💼', NULL,     'RECEPTIONIST', TRUE,  'reception',  '123'),
(12, 5,    'ĐD. Phạm Thị Nhanh', 'Điều dưỡng Cấp cứu',        '👩‍⚕️', NULL,     'NURSE',        TRUE,  'nursecap',   'nurse@2024'),
(9,  1,    'BS. Hoàng Đã Nghỉ',  'Bác sĩ cũ',                 '👨‍⚕️', NULL,     'DOCTOR',       FALSE, 'bsnghi',     'bsnghi@2024'),
(10, 1,    'BS. Nguyễn Văn A',   'Bác sĩ chuyên khoa Mạch',   '👨‍⚕️', NULL,     'DOCTOR',       TRUE,  'nva',        'nva@2024');

-- Insert Initial Test Patient
INSERT IGNORE INTO patients (id, patientCode, cccd, name, phone, email, password, gender, dob, address, medicalHistory) VALUES
(1, 'BN-10001', '079012345678', 'Nguyễn Văn A', '0901234567', 'nguyenvana@gmail.com', 'pass@2024', 'Nam', '1980-05-12', 'Quận 1, TP.HCM', '[]'),
(2, 'BN-10002', '079088888888', 'Trần Thị B', '0988888888', 'tranthib@gmail.com', 'pass@2025', 'Nữ', '1995-08-20', 'Quận 3, TP.HCM', '[]');
