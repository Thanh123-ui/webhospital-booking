require('dotenv').config(); // ← Load .env TRƯỚC KHI require db.js

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

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

app.use('/api/data', dataRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/staff', staffRoutes);

io.on('connection', (socket) => {
  console.log('User connected Socket:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected Socket:', socket.id));
});

// Khởi chạy Server qua http.createServer
server.listen(PORT, () => {
  console.log(`Backend Server + Socket.IO đang chạy tại http://localhost:${PORT}`);
});
