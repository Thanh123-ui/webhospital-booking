const express = require('express');
const cors = require('cors');
const { corsOptions } = require('./config/cors');
const { notFoundMiddleware, errorHandler } = require('./middlewares/error.middleware');

const dataRoutes = require('./routes/data.routes');
const authRoutes = require('./routes/auth.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const patientsRoutes = require('./routes/patients.routes');
const staffRoutes = require('./routes/staff.routes');
const emergencyRequestsRoutes = require('./routes/emergencyRequests.routes');

function createApp(io) {
  const app = express();

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/data', dataRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/patients', patientsRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/emergency-requests', emergencyRequestsRoutes);

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
