const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const productController = require('../controllers/product/product.controller');
const upload = require('../config/multer');
const { validateProductCreate, validateProductUpdate, validateProductSearch, validateId, validate } = require('../middleware/validators');

router.use(authenticate);

router.get('/', productController.getAll);
router.get('/low-stock', productController.getLowStock);
router.get('/search', validateProductSearch, validate, productController.search);
router.get('/:id', validateId, validate, productController.getOne);
router.post('/', authorize('owner', 'admin'), validateProductCreate, validate, productController.create);
router.put('/:id', authorize('owner', 'admin'), validateProductUpdate, validate, productController.update);
router.patch('/:id/stock', authorize('owner', 'admin', 'kasir'), validateId, validate, productController.updateStock);
router.delete('/:id', authorize('owner'), validateId, validate, productController.delete);
router.post('/:id/upload-image', authorize('owner', 'admin'), validateId, validate, upload.single('image'), async (req, res, next) => {
  try {
    const product = await require('../models/product/Product').findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    // Hapus foto lama kalau ada
    if (product.image) {
      const fs = require('fs');
      const oldPath = product.image.replace(`${process.env.APP_URL}/`, '');
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    product.image = `${process.env.APP_URL}/uploads/products/${req.file.filename}`;
    await product.save();

    res.json({ success: true, message: 'Foto berhasil diupload.', data: product });
  } catch (err) { next(err); }
});

router.delete('/:id/delete-image', authorize('owner', 'admin'), validateId, validate, async (req, res, next) => {
  try {
    const product = await require('../models/product/Product').findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    if (product.image) {
      const fs = require('fs');
      const filePath = product.image.replace(`${process.env.APP_URL}/`, '');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      product.image = null;
      await product.save();
    }

    res.json({ success: true, message: 'Foto berhasil dihapus.' });
  } catch (err) { next(err); }
});

module.exports = router;