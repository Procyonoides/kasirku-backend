const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth/auth.controller');
const { validateLogin, validateRegister, validateChangePassword, validate } = require('../middleware/validators');

router.post('/login', validateLogin, validate, authController.login);
router.post('/register', validateRegister, validate, authController.register);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, validateChangePassword, validate, authController.changePassword);
router.put('/update-profile', authenticate, authController.updateProfile);

module.exports = router;