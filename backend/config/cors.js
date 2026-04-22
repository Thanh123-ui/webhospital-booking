const { corsOrigins } = require('./env');

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const allowedOrigins = corsOrigins.length ? corsOrigins : defaultDevOrigins;

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin không được phép: ${origin}`));
  },
  credentials: true,
};

module.exports = {
  allowedOrigins,
  corsOptions,
  isOriginAllowed,
};
