const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/user/user.controller');
const { validateUserCreate, validateUserUpdate, validateId, validate } = require('../middleware/validators');

router.use(authenticate);
router.use(authorize('owner'));

router.get('/', userController.getAll);
router.get('/:id', validateId, validate, userController.getOne);
router.post('/', validateUserCreate, validate, userController.create);
router.put('/:id', validateUserUpdate, validate, userController.update);
router.patch('/:id/reset-password', validateId, validate, userController.resetPassword);
router.patch('/:id/toggle-active', validateId, validate, userController.toggleActive);
router.delete('/:id', validateId, validate, userController.delete);

module.exports = router;