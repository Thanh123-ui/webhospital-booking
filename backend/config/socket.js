const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../data/db');
const { corsOptions } = require('./cors');
const { jwtSecret } = require('./env');

async function joinAuthorizedRooms(socket) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return;

    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded?.id || !decoded?.role) return;

    const [staffList, departments] = await Promise.all([
      db.getStaff(),
      db.getDepartments(),
    ]);
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

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket'],
  });

  io.on('connection', (socket) => {
    console.log('User connected Socket:', socket.id);
    joinAuthorizedRooms(socket);
    socket.on('disconnect', () => console.log('User disconnected Socket:', socket.id));
  });

  return io;
}

module.exports = {
  createSocketServer,
};
