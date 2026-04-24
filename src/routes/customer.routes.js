const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const customerController = require('../controllers/customer/customer.controller');
const { validateCustomerCreate, validateCustomerUpdate, validateId, validate } = require('../middleware/validators');

router.use(authenticate);

router.get('/', customerController.getAll);
router.get('/debtors', customerController.getDebtors);
router.get('/:id', validateId, validate, customerController.getOne);
router.get('/:id/transactions', validateId, validate, customerController.getTransactions);
router.get('/:id/points', validateId, validate, customerController.getPointHistory);
router.post('/', validateCustomerCreate, validate, customerController.create);
router.put('/:id', validateCustomerUpdate, validate, customerController.update);
router.delete('/:id', authorize('owner'), validateId, validate, customerController.delete);

module.exports = router;