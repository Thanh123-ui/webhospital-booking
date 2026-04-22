const http = require('http');
require('./config/env');

const db = require('./data/db');
const { port } = require('./config/env');
const { createSocketServer } = require('./config/socket');
const { createApp } = require('./app');

const server = http.createServer();
const io = createSocketServer(server);
const app = createApp(io);

server.on('request', app);

server.listen(port, async () => {
  console.log(`Backend Server + Socket.IO đang chạy tại http://localhost:${port}`);
  if (db.DB_MODE === 'mysql') {
    await db.initDatabase();
    await db.generateSchedulesIfEmpty();
  }
});
