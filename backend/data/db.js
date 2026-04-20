// ─────────────────────────────────────────────────────────────────────────────
// db.js — Database Adapter
// Hỗ trợ 2 chế độ qua biến môi trường DB_MODE:
//   DB_MODE=mock  (mặc định) → dùng in-memory mock data (không cần DB thật)
//   DB_MODE=mysql            → kết nối MySQL / AWS RDS qua mysql2
//
// Tất cả exports có cùng interface ở cả 2 mode → code controller KHÔNG đổi.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

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
    schedules: generateMockSchedules(),
    staffList: [...initialStaff],
    patientsList: [...initialPatients],
    appointmentsList: [...initialAppointments],
    logsList: [],
    ratingsList: [],
    emergencyTransfers: [],
  };

  // ── Async API (mock trả về Promise để interface đồng nhất với MySQL) ──────

  async function getDepartments() { return state.mockDepartments; }
  async function getDoctors() { return state.mockDoctors; }
  async function getAppointments() { return state.appointmentsList; }
  async function getPatients() { return state.patientsList; }
  async function getSchedules() { return state.schedules; }
  async function getStaff() { return state.staffList; }
  async function getRatings() { return state.ratingsList; }
  async function getEmergencyTransfers() { return state.emergencyTransfers; }

  // ── CRUD async functions (mock mode) ────────────────────────────────────

  async function saveAppointment(appt) {
    state.appointmentsList.unshift(appt);
    return appt;
  }

  async function updateAppointment(id, fields) {
    const idx = state.appointmentsList.findIndex(a => a.id === id);
    if (idx === -1) return null;
    Object.assign(state.appointmentsList[idx], fields);
    return state.appointmentsList[idx];
  }

  async function findAppointmentById(id) {
    return state.appointmentsList.find(a => a.id === id) || null;
  }

  async function findAppointmentByCode(code, phone) {
    return state.appointmentsList.find(a => a.code === code && a.phone === phone) || null;
  }

  async function findPatientByPhone(phone) {
    return state.patientsList.find(p => p.phone === phone) || null;
  }

  async function findPatientById(id) {
    return state.patientsList.find(p => p.id === id) || null;
  }

  async function addPatient(patient) {
    patient.password = await bcrypt.hash(patient.password, saltRounds);
    state.patientsList.push(patient);
    return patient;
  }

  async function updatePatient(id, fields) {
    const idx = state.patientsList.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(state.patientsList[idx], fields);
    return state.patientsList[idx];
  }

  async function appendMedicalHistory(patientId, record) {
    const patient = state.patientsList.find(p => p.id === patientId);
    if (!patient) return null;
    patient.medicalHistory.unshift(record);
    return patient;
  }

  async function findStaffByUsername(username) {
    return state.staffList.find(s => s.username === username) || null;
  }

  async function addStaff(staff) {
    staff.password = await bcrypt.hash(staff.password, saltRounds);
    state.staffList.push(staff);
    return staff;
  }

  async function updateStaffField(id, fields) {
    const s = state.staffList.find(s => s.id === id);
    if (!s) return null;
    if (fields.password) {
      fields.password = await bcrypt.hash(fields.password, saltRounds);
    }
    Object.assign(s, fields);
    return s;
  }

  async function addRating(rating) {
    state.ratingsList.push(rating);
    return rating;
  }

  async function addLog(entry) {
    state.logsList.push(entry);
    return entry;
  }

  async function addEmergencyTransfer(record) {
    state.emergencyTransfers.push(record);
    return record;
  }

  async function updateScheduleBooked(doctorId, date, time, delta) {
    const idx = state.schedules.findIndex(
      s => s.doctorId === doctorId && s.date === date && s.time === time
    );
    if (idx !== -1) state.schedules[idx].booked += delta;
  }

  async function nextAppointmentId() { return state.appointmentsList.length + 1; }
  async function nextPatientId() { return state.patientsList.length + 1; }
  async function nextStaffId() { return state.staffList.length + 1; }

  // Vitals — lưu sinh hiệu (mock mode dùng Map trong bộ nhớ)
  const vitalsStore = new Map();
  async function saveVitals(data) {
    vitalsStore.set(data.appointmentId, { ...data, recordedAt: new Date().toISOString() });
    return data;
  }
  async function getVitalsByAppointmentId(appointmentId) {
    return vitalsStore.get(appointmentId) || null;
  }

  module.exports = {
    // ── Direct mutable refs (để backward-compat nếu có chỗ nào còn dùng) ──
    ...state,

    // ── Async query / CRUD functions ────────────────────────────────────────
    getDepartments, getDoctors, getAppointments, getPatients,
    getSchedules, getStaff, getRatings, getEmergencyTransfers,
    saveAppointment, updateAppointment, findAppointmentById, findAppointmentByCode,
    findPatientByPhone, findPatientById, addPatient, updatePatient, appendMedicalHistory,
    findStaffByUsername, addStaff, updateStaffField,
    addRating, addLog, addEmergencyTransfer, updateScheduleBooked,
    nextAppointmentId, nextPatientId, nextStaffId,
    saveVitals, getVitalsByAppointmentId,

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
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_booking',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
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

  // ── TỰ ĐỘNG TẠO SCHEMA nếu DB trống ─────────────────────────────────────
  async function initDatabase() {
    try {
      const path = require('path');
      const fs = require('fs');
      console.log('🔧 [DB] Đang đồng bộ schema từ schema.sql...');
      const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('✅  [DB] Đồng bộ schema và seed data thành công!');
    } catch (err) {
      console.error('❌  [DB] Lỗi khi tạo schema:', err.message);
    }
  }

  // ── TỰ SINH LỊCH KHÁM 7 NGÀY nếu bảng schedules trống ─────────────────
  async function generateSchedulesIfEmpty() {
    try {
      const rows = await query('SELECT COUNT(*) AS cnt FROM schedules');
      if (rows[0].cnt > 0) return;
      console.log('🔧 [DB] Bảng schedules trống, đang tự sinh lịch 7 ngày...');
      const doctors = await query("SELECT id FROM staff WHERE role = 'DOCTOR' AND isActive = 1");
      if (!doctors.length) return;
      const slots = [];
      const push = (startMin, count) => { for (let i = 0; i < count; i++) { const m = startMin + i * 35; slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); } };
      push(7 * 60, 8); push(13 * 60, 7);
      const today = new Date();
      const inserts = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        for (const doc of doctors) {
          for (const time of slots) {
            if (Math.random() > 0.1) inserts.push([doc.id, dateStr, time, 2, 0]);
          }
        }
      }
      if (inserts.length > 0) {
        await pool.query('INSERT INTO schedules (doctorId, `date`, `time`, maxPatients, booked) VALUES ?', [inserts]);
      }
      console.log(`✅  [DB] Đã sinh ${inserts.length} lịch khám cho bác sĩ.`);
    } catch (err) {
      console.error('❌  [DB] Lỗi khi sinh lịch:', err.message);
    }
  }

  // ── Async query helpers ─────────────────────────────────────────────────

  async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async function getDepartments() { return query('SELECT * FROM departments'); }
  async function getDoctors() { return query('SELECT * FROM staff WHERE role = \'DOCTOR\' AND isActive = 1'); }
  async function getAppointments() {
    const rows = await query(`
      SELECT a.*, v.bloodPressure, v.heartRate, v.temperature, v.weight, v.height, v.spO2, v.notes, v.recordedBy, v.recordedAt
      FROM appointments a
      LEFT JOIN vitals v ON v.appointmentId = a.id
      ORDER BY a.id DESC
    `);
    return rows.map(a => ({
      ...a,
      vitals: a.recordedAt ? {
        bloodPressure: a.bloodPressure,
        heartRate: a.heartRate,
        temperature: a.temperature,
        weight: a.weight,
        height: a.height,
        spO2: a.spO2,
        notes: a.notes,
        recordedBy: a.recordedBy,
        recordedAt: a.recordedAt,
      } : null,
    }));
  }
  async function getPatients() { return query('SELECT * FROM patients'); }
  async function getSchedules() { return query('SELECT * FROM schedules'); }
  async function getStaff() {
    const rows = await query('SELECT * FROM staff');
    return rows.map(s => {
      if (typeof s.permissions === 'string') {
        try { s.permissions = JSON.parse(s.permissions); } catch { s.permissions = []; }
      }
      return s;
    });
  }
  async function getRatings() { return query('SELECT * FROM ratings ORDER BY id DESC'); }
  async function getEmergencyTransfers() { return query('SELECT * FROM emergency_transfers ORDER BY id DESC'); }

  // ── CRUD functions (MySQL mode) ──────────────────────────────────────────

  async function saveAppointment(appt) {
    const sql = `INSERT INTO appointments
      (code, patientId, patientName, phone, doctorId, deptId, \`date\`, \`time\`, status, symptoms, is_emergency, current_department, history)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const historyJson = JSON.stringify(appt.history || []);
    const [result] = await pool.execute(sql, [
      appt.code, appt.patientId || null, appt.patientName, appt.phone,
      appt.doctorId || null, appt.deptId || null, appt.date, appt.time,
      appt.status, appt.symptoms || '', appt.is_emergency ? 1 : 0,
      appt.current_department || null, historyJson
    ]);
    appt.id = result.insertId;
    return appt;
  }

  async function updateAppointment(id, fields) {
    const allowed = ['status', 'doctorId', 'deptId', 'date', 'time', 'history', 'current_department'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (!allowed.includes(k)) continue;
      sets.push(`\`${k}\` = ?`);
      vals.push(k === 'history' ? JSON.stringify(v) : v);
    }
    if (!sets.length) return findAppointmentById(id);
    await pool.execute(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return findAppointmentById(id);
  }

  async function findAppointmentById(id) {
    const rows = await query(`
      SELECT a.*, v.bloodPressure, v.heartRate, v.temperature, v.weight, v.height, v.spO2, v.notes, v.recordedBy, v.recordedAt
      FROM appointments a
      LEFT JOIN vitals v ON v.appointmentId = a.id
      WHERE a.id = ?
    `, [id]);
    if (!rows[0]) return null;
    const a = rows[0];
    if (typeof a.history === 'string') try { a.history = JSON.parse(a.history); } catch { a.history = []; }
    a.vitals = a.recordedAt ? {
      bloodPressure: a.bloodPressure,
      heartRate: a.heartRate,
      temperature: a.temperature,
      weight: a.weight,
      height: a.height,
      spO2: a.spO2,
      notes: a.notes,
      recordedBy: a.recordedBy,
      recordedAt: a.recordedAt,
    } : null;
    return a;
  }

  async function findAppointmentByCode(code, phone) {
    const rows = await query(`
      SELECT a.*, v.bloodPressure, v.heartRate, v.temperature, v.weight, v.height, v.spO2, v.notes, v.recordedBy, v.recordedAt
      FROM appointments a
      LEFT JOIN vitals v ON v.appointmentId = a.id
      WHERE a.code = ? AND a.phone = ?
    `, [code, phone]);
    if (!rows[0]) return null;
    const appt = rows[0];
    if (typeof appt.history === 'string') try { appt.history = JSON.parse(appt.history); } catch { appt.history = []; }
    appt.vitals = appt.recordedAt ? {
      bloodPressure: appt.bloodPressure,
      heartRate: appt.heartRate,
      temperature: appt.temperature,
      weight: appt.weight,
      height: appt.height,
      spO2: appt.spO2,
      notes: appt.notes,
      recordedBy: appt.recordedBy,
      recordedAt: appt.recordedAt,
    } : null;
    return appt;
  }

  async function findPatientByPhone(phone) {
    const rows = await query('SELECT * FROM patients WHERE phone = ?', [phone]);
    if (!rows[0]) return null;
    const p = rows[0];
    if (typeof p.medicalHistory === 'string') try { p.medicalHistory = JSON.parse(p.medicalHistory); } catch { p.medicalHistory = []; }
    return p;
  }

  async function findPatientById(id) {
    const rows = await query('SELECT * FROM patients WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const p = rows[0];
    if (typeof p.medicalHistory === 'string') try { p.medicalHistory = JSON.parse(p.medicalHistory); } catch { p.medicalHistory = []; }
    return p;
  }

  async function addPatient(patient) {
    const hashedPassword = await bcrypt.hash(patient.password, saltRounds);
    const sql = `INSERT INTO patients (patientCode, cccd, name, phone, email, password, gender, dob, address, medicalHistory)
      VALUES (?,?,?,?,?,?,?,?,?,?)`;
    const [result] = await pool.execute(sql, [
      patient.patientCode, patient.cccd || '', patient.name, patient.phone,
      patient.email || '', hashedPassword, patient.gender || 'Unknown',
      patient.dob || null, patient.address || '', JSON.stringify([])
    ]);
    patient.id = result.insertId;
    return patient;
  }

  async function updatePatient(id, fields) {
    const allowed = ['cccd', 'dob', 'gender'];
    const sets = []; const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k) && v !== undefined) { sets.push(`\`${k}\` = ?`); vals.push(v); }
    }
    if (sets.length) await pool.execute(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    return findPatientById(id);
  }

  async function appendMedicalHistory(patientId, record) {
    const patient = await findPatientById(patientId);
    if (!patient) return null;
    const history = Array.isArray(patient.medicalHistory) ? patient.medicalHistory : [];
    history.unshift(record);
    await pool.execute('UPDATE patients SET medicalHistory = ? WHERE id = ?', [JSON.stringify(history), patientId]);
    patient.medicalHistory = history;
    return patient;
  }

  async function findStaffByUsername(username) {
    const rows = await query('SELECT * FROM staff WHERE username = ?', [username]);
    return rows[0] || null;
  }

  async function addStaff(staff) {
    const hashedPassword = await bcrypt.hash(staff.password, saltRounds);
    const sql = `INSERT INTO staff (deptId, name, title, avatar, role, isActive, username, password, permissions)
      VALUES (?,?,?,?,?,?,?,?,?)`;
    const [result] = await pool.execute(sql, [
      staff.deptId || null, staff.name, staff.title || '', staff.avatar || '👤',
      staff.role, staff.isActive ? 1 : 0, staff.username, hashedPassword, JSON.stringify(staff.permissions || [])
    ]);
    staff.id = result.insertId;
    return staff;
  }

  async function updateStaffField(id, fields) {
    const allowed = ['role', 'isActive', 'password', 'deptId', 'name', 'title', 'permissions'];
    const sets = []; const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) {
        if (k === 'password') {
          sets.push(`\`${k}\` = ?`);
          vals.push(await bcrypt.hash(v, saltRounds));
        } else if (k === 'permissions') {
          sets.push(`\`${k}\` = ?`);
          vals.push(JSON.stringify(v));
        } else {
          sets.push(`\`${k}\` = ?`);
          vals.push(v);
        }
      }
    }
    if (!sets.length) return null;
    await pool.execute(`UPDATE staff SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    const rows = await query('SELECT * FROM staff WHERE id = ?', [id]);
    const s = rows[0] || null;
    if (s && typeof s.permissions === 'string') {
      try { s.permissions = JSON.parse(s.permissions); } catch { s.permissions = []; }
    }
    return s;
  }

  async function addRating(rating) {
    await pool.execute(
      'INSERT INTO ratings (apptId, doctorName, rating, comment, \`date\`) VALUES (?,?,?,?,?)',
      [rating.apptId || null, rating.doctorName, rating.rating, rating.comment || '', rating.date]
    );
    return rating;
  }

  async function addLog(entry) {
    await pool.execute('INSERT INTO logs (\`date\`, action, \`by\`) VALUES (?,?,?)', [entry.date, entry.action, entry.by]);
    return entry;
  }

  async function addEmergencyTransfer(record) {
    const sql = `INSERT INTO emergency_transfers
      (appointmentId, appointmentCode, patientId, patientName, fromDeptId, fromDeptName, toDeptId, toDeptName, reason, transferredBy, transferredByName, transferredAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
    const [result] = await pool.execute(sql, [
      record.appointmentId, record.appointmentCode, record.patientId, record.patientName,
      record.fromDeptId || null, record.fromDeptName, record.toDeptId, record.toDeptName,
      record.reason || '', record.transferredBy, record.transferredByName || '', record.transferredAt
    ]);
    record.id = result.insertId;
    return record;
  }

  async function updateScheduleBooked(doctorId, date, time, delta) {
    await pool.execute(
      'UPDATE schedules SET booked = booked + ? WHERE doctorId = ? AND `date` = ? AND `time` = ?',
      [delta, doctorId, date, time]
    );
  }

  // ── VITALS (sinh hiệu — bảng riêng) ──────────────────────────────────────────
  async function saveVitals(data) {
    const sql = `INSERT INTO vitals
      (appointmentId, bloodPressure, heartRate, temperature, weight, height, spO2, notes, recordedBy)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
      bloodPressure=VALUES(bloodPressure), heartRate=VALUES(heartRate),
      temperature=VALUES(temperature), weight=VALUES(weight), height=VALUES(height),
      spO2=VALUES(spO2), notes=VALUES(notes), recordedBy=VALUES(recordedBy), recordedAt=NOW()`;
    await pool.execute(sql, [
      data.appointmentId, data.bloodPressure || null, data.heartRate || null,
      data.temperature || null, data.weight || null, data.height || null,
      data.spO2 || null, data.notes || '', data.recordedBy || null
    ]);
    return data;
  }

  async function getVitalsByAppointmentId(appointmentId) {
    const rows = await query('SELECT * FROM vitals WHERE appointmentId = ?', [appointmentId]);
    return rows[0] || null;
  }

  async function nextAppointmentId() {
    const rows = await query('SELECT MAX(id) AS mx FROM appointments');
    return (rows[0]?.mx || 0) + 1;
  }
  async function nextPatientId() {
    const rows = await query('SELECT MAX(id) AS mx FROM patients');
    return (rows[0]?.mx || 0) + 1;
  }
  async function nextStaffId() {
    const rows = await query('SELECT MAX(id) AS mx FROM staff');
    return (rows[0]?.mx || 0) + 1;
  }

  module.exports = {
    getDepartments, getDoctors, getAppointments, getPatients,
    getSchedules, getStaff, getRatings, getEmergencyTransfers,
    saveAppointment, updateAppointment, findAppointmentById, findAppointmentByCode,
    findPatientByPhone, findPatientById, addPatient, updatePatient, appendMedicalHistory,
    findStaffByUsername, addStaff, updateStaffField,
    addRating, addLog, addEmergencyTransfer, updateScheduleBooked,
    nextAppointmentId, nextPatientId, nextStaffId,
    saveVitals, getVitalsByAppointmentId,
    initDatabase, generateSchedulesIfEmpty,
    pool, query,
    DB_MODE: 'mysql',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  KHÔNG HỢP LỆ
// ═══════════════════════════════════════════════════════════════════════════
else {
  throw new Error(`[DB] Giá trị DB_MODE không hợp lệ: "${DB_MODE}". Hãy dùng "mock" hoặc "mysql".`);
}
