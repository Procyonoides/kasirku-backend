require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect Database
connectDB();

// Static Files
const path = require('path');
const uploadPath = path.resolve(__dirname, '..', 'uploads');
console.log('Upload path:', uploadPath);
app.use('/uploads', express.static(uploadPath));

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (Postman, curl, dll)
    if (!origin) return callback(null, true);
    // Development: izinkan semua localhost
    if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Production: hanya FRONTEND_URL
    if (origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate Limiting — hanya aktif di production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak request, coba lagi nanti.' }
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit.' }
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

// General Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));



// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', app: process.env.APP_NAME, timestamp: new Date() });
});

// Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`🚀 ${process.env.APP_NAME} Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;