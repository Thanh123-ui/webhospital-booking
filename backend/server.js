require('dotenv').config(); // ← Load .env TRƯỚC KHI require db.js

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./data/db');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

async function joinAuthorizedRooms(socket) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return;

    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded?.id || !decoded?.role) return;

    const staffList = await db.getStaff();
    const departments = await db.getDepartments();
    const currentStaff = staffList.find((staff) => staff.id === decoded.id);

    if (!currentStaff) return;

    if (currentStaff.deptId) {
      socket.join(`dept_${currentStaff.deptId}`);
    }

    if (decoded.role === 'RECEPTIONIST') {
      socket.join('emergency_alerts');
      return;
    }

    if (!['DOCTOR', 'NURSE'].includes(decoded.role)) return;

    const currentDept = departments.find((dept) => dept.id === currentStaff.deptId);
    if (currentDept?.isEmergency) {
      socket.join('emergency_alerts');
    }
  } catch (err) {
    console.warn('Socket auth skipped:', err.message);
  }
}

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const dataRoutes = require('./routes/data.routes');
const authRoutes = require('./routes/auth.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const patientsRoutes = require('./routes/patients.routes');
const staffRoutes = require('./routes/staff.routes');
const emergencyRequestsRoutes = require('./routes/emergencyRequests.routes');

app.use('/api/data', dataRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/emergency-requests', emergencyRequestsRoutes);

io.on('connection', (socket) => {
  console.log('User connected Socket:', socket.id);
  joinAuthorizedRooms(socket);
  socket.on('disconnect', () => console.log('User disconnected Socket:', socket.id));
});

// Khởi chạy Server qua http.createServer
server.listen(PORT, async () => {
  console.log(`Backend Server + Socket.IO đang chạy tại http://localhost:${PORT}`);
  // Tự động khởi tạo DB và sinh lịch nếu đang dùng MySQL
  if (db.DB_MODE === 'mysql') {
    await db.initDatabase();
    await db.generateSchedulesIfEmpty();
  }
});
