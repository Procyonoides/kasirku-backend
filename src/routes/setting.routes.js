const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateSetting, validate } = require('../middleware/validators');
const settingController = require('../controllers/setting/setting.controller');

router.use(authenticate);

router.get('/', settingController.get);
router.put('/', authorize('owner'), validateSetting, validate, settingController.update);

module.exports = router;