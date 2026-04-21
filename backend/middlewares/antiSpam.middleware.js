const requestBuckets = new Map();

function pruneBucket(bucket, now, windowMs) {
  while (bucket.length && now - bucket[0] > windowMs) {
    bucket.shift();
  }
}

function createAntiSpamGuard(options = {}) {
  const {
    bucket = 'default',
    windowMs = 10 * 60 * 1000,
    max = 5,
    keyBuilder,
    message = 'Bạn thao tác quá nhanh. Vui lòng chờ ít phút rồi thử lại.',
  } = options;

  return (req, res, next) => {
    const now = Date.now();
    const identifier = typeof keyBuilder === 'function'
      ? keyBuilder(req)
      : req.ip;

    const requestKey = `${bucket}:${identifier || req.ip || 'unknown'}`;
    const existing = requestBuckets.get(requestKey) || [];

    pruneBucket(existing, now, windowMs);

    if (existing.length >= max) {
      return res.status(429).json({ message });
    }

    existing.push(now);
    requestBuckets.set(requestKey, existing);
    next();
  };
}

module.exports = {
  createAntiSpamGuard,
};
