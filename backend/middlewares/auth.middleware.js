const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided!' });
        }

        const token = authHeader.split(' ')[1]; // Format: Bearer <token>
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access Denied: Invalid Token Format!' });
        }

        const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

        const decoded = jwt.verify(token, secret);
        req.user = decoded; // Contains id, role, etc.
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or Expired Token!', error: err.message });
    }
};
