const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSku: { type: String },
  qty: { type: Number, required: true, min: 1 },
  buyPrice: { type: Number, required: true },
  sellPrice: { type: Number, required: true },
  originalPrice: { type: Number },
  isCustomPrice: { type: Boolean, default: false },
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
  downPayment: { type: Number, default: 0 },
  keptChange: { type: Number, default: 0 },
  pointsUsed: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 },
  pointsDiscount: { type: Number, default: 0 },
  debtPaidAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['selesai', 'dibatalkan', 'hutang'], default: 'selesai' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

transactionSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const now = new Date();

    // Tanggal lokal (bukan UTC), supaya transaksi pagi hari tidak bertanggal kemarin
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

    // Nomor urut = nomor tertinggi yang sudah ada + 1 (bukan jumlah transaksi),
    // supaya tidak bentrok setelah ada transaksi yang dihapus permanen
    const [row] = await mongoose.model('Transaction').aggregate([
      { $match: { invoiceNumber: { $regex: /^INV-\d{8}-\d+$/ } } },
      { $project: { seq: { $toInt: { $arrayElemAt: [{ $split: ['$invoiceNumber', '-'] }, 2] } } } },
      { $group: { _id: null, max: { $max: '$seq' } } }
    ]);
    const nextSeq = (row ? row.max : 0) + 1;

    this.invoiceNumber = `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);