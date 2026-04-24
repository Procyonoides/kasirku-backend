const { body, query, param, validationResult } = require('express-validator');

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

// Middleware untuk handle validation errors
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// ============================================
// AUTH VALIDATORS
// ============================================

exports.validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi')
    .isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter')
];

exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama wajib diisi')
    .isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi')
    .isLength({ min: 3, max: 50 }).withMessage('Username 3-50 karakter')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username hanya alfanumerik, underscore, dash'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role')
    .optional()
    .isIn(['owner', 'admin', 'kasir']).withMessage('Role tidak valid')
];

exports.validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Password lama wajib diisi'),
  body('newPassword')
    .notEmpty().withMessage('Password baru wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter')
];

// ============================================
// PRODUCT VALIDATORS
// ============================================

exports.validateProductCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama produk wajib diisi')
    .isLength({ min: 2, max: 100 }).withMessage('Nama produk 2-100 karakter'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('SKU maksimal 50 karakter'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Barcode maksimal 50 karakter'),
  body('categoryId')
    .notEmpty().withMessage('Kategori wajib dipilih')
    .isMongoId().withMessage('Kategori ID invalid'),
  body('buyPrice')
    .notEmpty().withMessage('Harga beli wajib diisi')
    .isFloat({ min: 0 }).withMessage('Harga beli harus angka positif'),
  body('sellPrice')
    .notEmpty().withMessage('Harga jual wajib diisi')
    .isFloat({ min: 0 }).withMessage('Harga jual harus angka positif'),
  body('stock')
    .notEmpty().withMessage('Stok wajib diisi')
    .isInt({ min: 0 }).withMessage('Stok harus angka positif'),
  body('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Min stok harus angka positif'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter')
];

exports.validateProductUpdate = [
  param('id')
    .isMongoId().withMessage('Product ID invalid'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nama produk 2-100 karakter'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('SKU maksimal 50 karakter'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Barcode maksimal 50 karakter'),
  body('categoryId')
    .optional()
    .isMongoId().withMessage('Kategori ID invalid'),
  body('buyPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Harga beli harus angka positif'),
  body('sellPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Harga jual harus angka positif'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stok harus angka positif'),
  body('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Min stok harus angka positif'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter')
];

exports.validateProductSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Search maksimal 50 karakter')
    .escape(), // Prevent injection
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page harus angka positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit 1-100')
];

// ============================================
// SETTING VALIDATORS
// ============================================

exports.validateSetting = [
  body('storeName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Nama toko 1-100 karakter'),
  body('storeAddress')
    .optional()
    .trim()
    .isLength({ max: 250 }).withMessage('Alamat maksimal 250 karakter'),
  body('storePhone')
    .optional()
    .trim()
    .isMobilePhone('id-ID').withMessage('Nomor telepon tidak valid'),
  body('storeEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Email tidak valid'),
  body('storeDescription')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 }).withMessage('Currency 1-10 karakter')
];

// ============================================
// REPORT VALIDATORS
// ============================================

exports.validateReportFilters = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate format tidak valid (gunakan ISO8601: YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate format tidak valid (gunakan ISO8601: YYYY-MM-DD)'),
  query('groupBy')
    .optional()
    .isIn(['day', 'month']).withMessage('groupBy harus "day" atau "month"'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit 1-100')
];

// ============================================
// CUSTOMER VALIDATORS
// ============================================

exports.validateCustomerCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama pelanggan wajib diisi')
    .isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Format email tidak valid'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone(['id-ID']).withMessage('Format nomor telepon tidak valid'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Alamat maksimal 500 karakter'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Credit limit harus angka positif'),
  body('type')
    .optional()
    .isIn(['regular', 'member', 'corporate']).withMessage('Tipe pelanggan tidak valid')
];

exports.validateCustomerUpdate = [
  param('id')
    .isMongoId().withMessage('Customer ID invalid'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Format email tidak valid'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone(['id-ID']).withMessage('Format nomor telepon tidak valid'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Alamat maksimal 500 karakter'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 }).withMessage('Credit limit harus angka positif'),
  body('type')
    .optional()
    .isIn(['regular', 'member', 'corporate']).withMessage('Tipe pelanggan tidak valid')
];

// ============================================
// TRANSACTION VALIDATORS
// ============================================

exports.validateTransactionCreate = [
  body('customerId')
    .optional({ nullable: true })
    .isMongoId().withMessage('Customer ID invalid'),
  body('items')
    .isArray({ min: 1 }).withMessage('Minimal 1 item transaksi')
    .notEmpty().withMessage('Items wajib diisi'),
  body('items.*.productId')
    .isMongoId().withMessage('Product ID invalid'),
  body('items.*.qty')
    .isInt({ min: 1 }).withMessage('Qty harus minimal 1'),
  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Diskon harus 0-100%'),
  body('paymentMethod')
    .notEmpty().withMessage('Metode pembayaran wajib diisi')
    .isIn(['tunai', 'transfer', 'qris', 'hutang', 'kartu_debit', 'kartu_kredit']).withMessage('Metode pembayaran tidak valid'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Catatan maksimal 500 karakter')
];

// ============================================
// FINANCE VALIDATORS
// ============================================

exports.validateFinanceCreate = [
  body('date')
    .notEmpty().withMessage('Tanggal wajib diisi')
    .isISO8601().withMessage('Format tanggal tidak valid'),
  body('type')
    .notEmpty().withMessage('Tipe wajib diisi')
    .isIn(['pemasukan', 'pengeluaran']).withMessage('Tipe harus pemasukan atau pengeluaran'),
  body('category')
    .notEmpty().withMessage('Kategori wajib diisi'),
  body('amount')
    .notEmpty().withMessage('Jumlah wajib diisi')
    .isFloat({ min: 0 }).withMessage('Jumlah harus angka positif'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter'),
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Referensi maksimal 50 karakter')
];

exports.validateFinanceUpdate = [
  param('id')
    .isMongoId().withMessage('Finance ID invalid'),
  body('date')
    .optional()
    .isISO8601().withMessage('Format tanggal tidak valid'),
  body('type')
    .optional()
    .isIn(['pemasukan', 'pengeluaran']).withMessage('Tipe harus pemasukan atau pengeluaran'),
  body('category')
    .optional(),
  body('amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Jumlah harus angka positif'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter'),
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Referensi maksimal 50 karakter')
];

// ============================================
// CATEGORY VALIDATORS
// ============================================

exports.validateCategoryCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama kategori wajib diisi')
    .isLength({ min: 2, max: 50 }).withMessage('Nama kategori 2-50 karakter'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Deskripsi maksimal 200 karakter')
];

exports.validateCategoryUpdate = [
  param('id')
    .isMongoId().withMessage('Category ID invalid'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Nama kategori 2-50 karakter'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Deskripsi maksimal 200 karakter')
];

// ============================================
// USER VALIDATORS
// ============================================

exports.validateUserCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama wajib diisi')
    .isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi')
    .isLength({ min: 3, max: 50 }).withMessage('Username 3-50 karakter')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username hanya alfanumerik, underscore, dash'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role')
    .notEmpty().withMessage('Role wajib diisi')
    .isIn(['owner', 'admin', 'kasir']).withMessage('Role tidak valid (owner/admin/kasir)')
];

exports.validateUserUpdate = [
  param('id')
    .isMongoId().withMessage('User ID invalid'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nama 2-100 karakter'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Username 3-50 karakter')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username hanya alfanumerik, underscore, dash'),
  body('role')
    .optional()
    .isIn(['owner', 'admin', 'kasir']).withMessage('Role tidak valid (owner/admin/kasir)'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive harus boolean')
];

// ============================================
// SETTING VALIDATORS
// ============================================

exports.validateSettingUpdate = [
  body('storeName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nama toko 2-100 karakter'),
  body('storeAddress')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Alamat maksimal 500 karakter'),
  body('storePhone')
    .optional()
    .trim()
    .isMobilePhone(['id-ID']).withMessage('Format nomor telepon tidak valid'),
  body('storeEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Format email tidak valid'),
  body('storeDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Deskripsi maksimal 1000 karakter'),
  body('currency')
    .optional()
    .isLength({ min: 1, max: 3 }).withMessage('Kode currency 1-3 karakter')
];

// ============================================
// MONGO ID VALIDATORS
// ============================================

exports.validateId = [
  param('id')
    .isMongoId().withMessage('ID tidak valid')
];

exports.validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page harus angka positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit 1-100'),
  query('sort')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort harus asc atau desc')
];
