const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const financeController = require('../controllers/finance/finance.controller');
const { validateFinanceCreate, validateFinanceUpdate, validateId, validate } = require('../middleware/validators');

router.use(authenticate);


// GET routes must come before :id routes to avoid hijacking
router.get('/summary', financeController.getSummary);
router.get('/', financeController.getAll);
router.post('/', validateFinanceCreate, validate, financeController.create);
router.put('/:id', authorize('owner', 'admin'), validateFinanceUpdate, validate, financeController.update);
router.delete('/:id', authorize('owner'), validateId, validate, financeController.delete);

module.exports = router;