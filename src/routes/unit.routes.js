const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Unit = require('../models/unit/Unit');
const Product = require('../models/product/Product');
const { validateUnitCreate, validateUnitUpdate, validateId, validate } = require('../middleware/validators');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const units = await Unit.find({ isActive: true }).sort('name');
    res.json({ success: true, data: units });
  } catch (err) { next(err); }
});

router.post('/', authorize('owner', 'admin'), validateUnitCreate, validate, async (req, res, next) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json({ success: true, data: unit });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('owner', 'admin'), validateUnitUpdate, validate, async (req, res, next) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!unit) return res.status(404).json({ success: false, message: 'Satuan tidak ditemukan.' });
    res.json({ success: true, data: unit });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('owner'), validateId, validate, async (req, res, next) => {
  try {
    const usedCount = await Product.countDocuments({ unit: req.params.id, isActive: true });
    if (usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Satuan masih dipakai oleh ${usedCount} produk. Ganti satuan produk tersebut dulu sebelum menghapus.`
      });
    }
    await Unit.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Satuan dihapus.' });
  } catch (err) { next(err); }
});

module.exports = router;
