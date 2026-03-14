const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} | ${req.method} ${req.originalUrl}`);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Data tidak valid.', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} sudah digunakan.`
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token tidak valid.' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan server.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;