const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const transactionController = require('../controllers/transaction/transaction.controller');
const { validateTransactionCreate, validateId, validate } = require('../middleware/validators');

router.use(authenticate);

router.get('/', transactionController.getAll);
router.get('/today', transactionController.getToday);
router.get('/:id', validateId, validate, transactionController.getOne);
router.post('/', validateTransactionCreate, validate, transactionController.create);
router.patch('/:id/cancel', authorize('owner', 'admin'), validateId, validate, transactionController.cancel);
router.post('/debt/:id/pay', validateId, validate, transactionController.payDebt);

module.exports = router;