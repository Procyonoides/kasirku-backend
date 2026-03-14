const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard/dashboard.controller');

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/chart/sales', dashboardController.salesChart);
router.get('/recent', dashboardController.getRecent);

module.exports = router;