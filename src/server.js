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

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:4200',
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti.' }
});
app.use('/api/', limiter);

// General Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Static Files
app.use('/uploads', express.static('uploads'));

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