const Product = require('../../models/product/Product');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, status } = req.query;
    const query = { isActive: true };

    if (category) query.category = category;
    if (status === 'habis') query.stock = 0;
    if (status === 'menipis') query.$expr = { $lte: ['$stock', '$minStock'] };
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { sku: { $regex: escapedSearch, $options: 'i' } },
        { barcode: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name color')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: products, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).populate('category', 'name').sort({ stock: 1 });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: [] });
    }
    const escapedQ = escapeRegex(q.trim());
    const products = await Product.find({
      isActive: true,
      stock: { $gt: 0 },
      $or: [
        { name: { $regex: escapedQ, $options: 'i' } },
        { sku: { $regex: escapedQ, $options: 'i' } },
        { barcode: q.trim() }
      ]
    }).limit(10).select('name sku barcode sellPrice stock unit image');
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan.', data: product });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    res.json({ success: true, message: 'Produk berhasil diperbarui.', data: product });
  } catch (err) { next(err); }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { qty, type } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });

    if (type === 'tambah') product.stock += qty;
    else if (type === 'kurang') {
      if (product.stock < qty) return res.status(400).json({ success: false, message: 'Stok tidak mencukupi.' });
      product.stock -= qty;
    }

    await product.save();
    res.json({ success: true, message: 'Stok berhasil diperbarui.', data: product });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (err) { next(err); }
};