const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const transactionController = require('../controllers/transaction/transaction.controller');

router.use(authenticate);

router.get('/', transactionController.getAll);
router.get('/today', transactionController.getToday);
router.get('/:id', transactionController.getOne);
router.post('/', transactionController.create);
router.patch('/:id/cancel', authorize('owner', 'admin'), transactionController.cancel);
router.post('/debt/:id/pay', transactionController.payDebt);

module.exports = router;