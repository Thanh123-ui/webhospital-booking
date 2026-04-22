const { AppError } = require('../utils/http');

function notFoundMiddleware(req, res, next) {
  next(new AppError(`Không tìm thấy endpoint ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON gửi lên không hợp lệ.',
    });
  }

  const status = err.status || 500;
  const payload = {
    success: false,
    message: err.message || 'Lỗi server.',
  };

  if (err.details) {
    payload.errors = err.details;
  }

  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.error = err.stack || err.message;
  }

  return res.status(status).json(payload);
}

module.exports = {
  notFoundMiddleware,
  errorHandler,
};
