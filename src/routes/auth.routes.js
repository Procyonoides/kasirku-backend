const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth/auth.controller');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, authController.changePassword);
router.put('/update-profile', authenticate, authController.updateProfile);

module.exports = router;