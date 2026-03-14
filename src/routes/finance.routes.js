const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const financeController = require('../controllers/finance/finance.controller');

router.use(authenticate);

router.get('/', financeController.getAll);
router.get('/summary', financeController.getSummary);
router.post('/', financeController.create);
router.put('/:id', authorize('owner', 'admin'), financeController.update);
router.delete('/:id', authorize('owner'), financeController.delete);

module.exports = router;