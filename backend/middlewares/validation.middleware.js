const { AppError } = require('../utils/http');

const getValue = (req, source, field) => (req[source] || {})[field];

const validateRequest = (rules = []) => (req, res, next) => {
  const errors = [];

  for (const rule of rules) {
    const source = rule.in || 'body';
    const value = getValue(req, source, rule.field);
    const message = rule.validate(value, req);

    if (message) {
      errors.push({ field: rule.field, message });
    }
  }

  if (errors.length) {
    return next(new AppError('Dữ liệu gửi lên không hợp lệ.', 400, errors));
  }

  return next();
};

const validators = {
  requiredString: (label) => (value) =>
    String(value || '').trim() ? null : `${label} là bắt buộc.`,
  optionalString: () => () => null,
  requiredEnum: (label, allowed) => (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    return allowed.includes(normalized) ? null : `${label} không hợp lệ.`;
  },
  requiredObject: (label) => (value) =>
    value && typeof value === 'object' && !Array.isArray(value) ? null : `${label} là bắt buộc.`,
};

module.exports = {
  validateRequest,
  validators,
};
