const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reportController = require('../controllers/report/report.controller');

router.use(authenticate);

router.get('/sales', reportController.salesReport);
router.get('/profit-loss', reportController.profitLoss);
router.get('/top-products', reportController.topProducts);
router.get('/cashflow', reportController.cashflow);

module.exports = router;