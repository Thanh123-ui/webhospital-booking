class AppError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

const sendSuccess = (res, data, message = undefined, status = 200) => {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return res.status(status).json(payload);
};

const toAppError = (err, fallbackMessage = 'Lỗi server', fallbackStatus = 500) => {
  if (err instanceof AppError) return err;
  return new AppError(err?.message || fallbackMessage, err?.status || fallbackStatus, err?.details || null);
};

module.exports = {
  AppError,
  sendSuccess,
  toAppError,
};
