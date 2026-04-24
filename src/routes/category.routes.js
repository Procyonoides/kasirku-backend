const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Category = require('../models/category/Category');
const { validateCategoryCreate, validateCategoryUpdate, validateId, validate } = require('../middleware/validators');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name');
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

router.post('/', authorize('owner', 'admin'), validateCategoryCreate, validate, async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('owner', 'admin'), validateCategoryUpdate, validate, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('owner'), validateId, validate, async (req, res, next) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Kategori dihapus.' });
  } catch (err) { next(err); }
});

module.exports = router;