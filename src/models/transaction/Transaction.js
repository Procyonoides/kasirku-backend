const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSku: { type: String },
  qty: { type: Number, required: true, min: 1 },
  buyPrice: { type: Number, required: true },
  sellPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, default: 'Umum' },
  items: [transactionItemSchema],
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['tunai', 'transfer', 'qris', 'hutang', 'kartu_debit', 'kartu_kredit'],
    default: 'tunai'
  },
  amountPaid: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  isDebt: { type: Boolean, default: false },
  debtPaidAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['selesai', 'dibatalkan', 'hutang'], default: 'selesai' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

transactionSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Transaction').countDocuments();
    this.invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);