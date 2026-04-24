const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateReportFilters, validate } = require('../middleware/validators');
const reportController = require('../controllers/report/report.controller');

router.use(authenticate);

router.get('/sales', validateReportFilters, validate, reportController.salesReport);
router.get('/profit-loss', validateReportFilters, validate, reportController.profitLoss);
router.get('/top-products', validateReportFilters, validate, reportController.topProducts);
router.get('/cashflow', validateReportFilters, validate, reportController.cashflow);

module.exports = router;