const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, unique: true, sparse: true },
  barcode: { type: String, sparse: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  description: { type: String, default: '' },
  image: { type: String, default: null },
  buyPrice: { type: Number, required: true, min: 0 },
  sellPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 5 },
  unit: { type: String, default: 'pcs' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.virtual('profitMargin').get(function () {
  if (this.buyPrice === 0) return 0;
  return (((this.sellPrice - this.buyPrice) / this.buyPrice) * 100).toFixed(2);
});

productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'habis';
  if (this.stock <= this.minStock) return 'menipis';
  return 'aman';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.pre('save', async function (next) {
  if (!this.sku) {
    const count = await mongoose.model('Product').countDocuments();
    this.sku = `PRD-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);