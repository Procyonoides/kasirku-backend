const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const customerController = require('../controllers/customer/customer.controller');

router.use(authenticate);

router.get('/', customerController.getAll);
router.get('/debtors', customerController.getDebtors);
router.get('/:id', customerController.getOne);
router.get('/:id/transactions', customerController.getTransactions);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', authorize('owner'), customerController.delete);

module.exports = router;