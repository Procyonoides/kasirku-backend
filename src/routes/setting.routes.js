const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const settingController = require('../controllers/setting/setting.controller');

router.use(authenticate);

router.get('/', settingController.get);
router.put('/', authorize('owner'), settingController.update);

module.exports = router;