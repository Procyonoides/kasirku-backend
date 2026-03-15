const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/user/user.controller');

router.use(authenticate);
router.use(authorize('owner'));

router.get('/', userController.getAll);
router.get('/:id', userController.getOne);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.patch('/:id/reset-password', userController.resetPassword);
router.patch('/:id/toggle-active', userController.toggleActive);
router.delete('/:id', userController.delete);

module.exports = router;