// ─────────────────────────────────────────────────────────────────────────────
// db.js — Database Adapter
// Hỗ trợ 2 chế độ qua biến môi trường DB_MODE:
//   DB_MODE=mock  (mặc định) → dùng in-memory mock data (không cần DB thật)
//   DB_MODE=mysql            → kết nối MySQL / AWS RDS qua mysql2
//
// Tất cả exports có cùng interface ở cả 2 mode → code controller KHÔNG đổi.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const DB_MODE = (process.env.DB_MODE || 'mock').toLowerCase();

// ═══════════════════════════════════════════════════════════════════════════
//  MODE: MOCK (in-memory)
// ═══════════════════════════════════════════════════════════════════════════
if (DB_MODE === 'mock') {
  const {
    mockDepartments,
    mockDoctors,
    initialStaff,
    initialPatients,
    initialAppointments,
    generateMockSchedules,
  } = require('./mockData');

  // Mutable state — sống trong bộ nhớ suốt thời gian chạy server
  const state = {
    mockDepartments,
    mockDoctors,
    schedules:          generateMockSchedules(),
    staffList:          [...initialStaff],
    patientsList:       [...initialPatients],
    appointmentsList:   [...initialAppointments],
    logsList:           [],
    ratingsList:        [],
    emergencyTransfers: [],
  };

  // ── Async API (mock trả về Promise để interface đồng nhất với MySQL) ──────

  /** @returns {Promise<Array>} Danh sách chuyên khoa */
  async function getDepartments()  { return state.mockDepartments; }

  /** @returns {Promise<Array>} Danh sách bác sĩ */
  async function getDoctors()      { return state.mockDoctors; }

  /** @returns {Promise<Array>} Danh sách lịch hẹn */
  async function getAppointments() { return state.appointmentsList; }

  /** @returns {Promise<Array>} Danh sách bệnh nhân */
  async function getPatients()     { return state.patientsList; }

  /** @returns {Promise<Array>} Danh sách lịch làm việc */
  async function getSchedules()    { return state.schedules; }

  // Xuất cả state mutable (cho controllers đọc/ghi trực tiếp như cũ)
  // VÀ async API mới — cả 2 tồn tại song song để backward-compatible.
  module.exports = {
    // ── Direct mutable refs (legacy — controllers hiện tại dùng cách này) ──
    ...state,

    // ── Async query functions (chuẩn mới — dùng cho code mới) ─────────────
    getDepartments,
    getDoctors,
    getAppointments,
    getPatients,
    getSchedules,

    // Helper: biết đang ở mode nào
    DB_MODE: 'mock',
  };

  console.log('✅  [DB] Chạy ở chế độ MOCK — dữ liệu lưu trong bộ nhớ.');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODE: MYSQL (AWS RDS hoặc local MySQL)
// ═══════════════════════════════════════════════════════════════════════════
else if (DB_MODE === 'mysql') {
  const mysql = require('mysql2/promise');

  // Pool kết nối (tái sử dụng connection, auto-reconnect)
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'hospital',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
  });

  // Kiểm tra kết nối ngay khi khởi động
  pool.getConnection()
    .then(conn => {
      console.log(`✅  [DB] Kết nối MySQL thành công → ${process.env.DB_HOST}/${process.env.DB_NAME}`);
      conn.release();
    })
    .catch(err => {
      console.error('❌  [DB] Không thể kết nối MySQL:', err.message);
      console.error('    Kiểm tra lại DB_HOST, DB_USER, DB_PASSWORD, DB_NAME trong file .env');
      process.exit(1); // Dừng server nếu DB không kết nối được
    });

  // ── Async query helpers ─────────────────────────────────────────────────

  /**
   * Hàm truy vấn chung — dùng nội bộ.
   * @param {string} sql
   * @param {Array}  params
   * @returns {Promise<Array>}
   */
  async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  /** @returns {Promise<Array>} */
  async function getDepartments()  { return query('SELECT * FROM departments'); }

  /** @returns {Promise<Array>} */
  async function getDoctors()      { return query('SELECT * FROM doctors'); }

  /** @returns {Promise<Array>} */
  async function getAppointments() { return query('SELECT * FROM appointments ORDER BY id DESC'); }

  /** @returns {Promise<Array>} */
  async function getPatients()     { return query('SELECT * FROM patients'); }

  /** @returns {Promise<Array>} */
  async function getSchedules()    { return query('SELECT * FROM schedules'); }

  // ── Các biến mutable cần bởi legacy controllers ─────────────────────────
  // Trong MySQL mode, controllers nên chuyển sang dùng async functions ở trên.
  // Các ref dưới đây để tránh crash, nhưng SẼ KHÔNG đồng bộ với DB thật.
  const legacyWarning = (name) => {
    console.warn(`⚠️  [DB] Truy cập trực tiếp vào "${name}" không hoạt động trong MySQL mode. Hãy dùng async function tương ứng.`);
    return [];
  };

  module.exports = {
    // ── Async functions (nên dùng) ─────────────────────────────────────────
    getDepartments,
    getDoctors,
    getAppointments,
    getPatients,
    getSchedules,

    // ── pool — dành cho controllers cần query tuỳ chỉnh ───────────────────
    pool,
    query,

    // ── Stub cho legacy controllers (in ra warning khi dùng) ──────────────
    get mockDepartments()  { return legacyWarning('mockDepartments');  },
    get mockDoctors()      { return legacyWarning('mockDoctors');      },
    get schedules()        { return legacyWarning('schedules');        },
    get staffList()        { return legacyWarning('staffList');        },
    get patientsList()     { return legacyWarning('patientsList');     },
    get appointmentsList() { return legacyWarning('appointmentsList'); },
    get logsList()         { return legacyWarning('logsList');         },
    get ratingsList()      { return legacyWarning('ratingsList');      },
    get emergencyTransfers(){ return legacyWarning('emergencyTransfers'); },

    DB_MODE: 'mysql',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  KHÔNG HỢP LỆ
// ═══════════════════════════════════════════════════════════════════════════
else {
  throw new Error(`[DB] Giá trị DB_MODE không hợp lệ: "${DB_MODE}". Hãy dùng "mock" hoặc "mysql".`);
}
