const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  type: { type: String, enum: ['pemasukan', 'pengeluaran'], required: true },
  category: {
    type: String,
    enum: [
      'pembelian_stok', 'gaji', 'sewa', 'listrik', 'air', 'internet',
      'perawatan', 'transportasi', 'marketing', 'lain_lain_keluar',
      'modal', 'pinjaman', 'lain_lain_masuk',
      'penjualan', 'piutang_masuk'
    ],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  paymentMethod: { type: String, default: 'tunai' },
  receipt: { type: String, default: null },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Finance', financeSchema);