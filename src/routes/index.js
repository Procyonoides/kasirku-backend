const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const customerRoutes = require('./customer.routes');
const transactionRoutes = require('./transaction.routes');
const financeRoutes = require('./finance.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');
const userRoutes = require('./user.routes');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/transactions', transactionRoutes);
router.use('/finance', financeRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);

module.exports = router;