const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const productController = require('../controllers/product/product.controller');

router.use(authenticate);

router.get('/', productController.getAll);
router.get('/low-stock', productController.getLowStock);
router.get('/search', productController.search);
router.get('/:id', productController.getOne);
router.post('/', authorize('owner', 'admin'), productController.create);
router.put('/:id', authorize('owner', 'admin'), productController.update);
router.patch('/:id/stock', authorize('owner', 'admin', 'kasir'), productController.updateStock);
router.delete('/:id', authorize('owner'), productController.delete);

module.exports = router;