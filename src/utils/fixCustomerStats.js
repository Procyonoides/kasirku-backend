/**
 * fixCustomerStats.js - Hitung ulang statistik pelanggan dari transaksi yang benar-benar ada.
 *
 * AMAN: secara bawaan hanya menampilkan pratinjau (tidak mengubah apa pun).
 *
 * Cara pakai (jalankan dari folder kasirku-backend):
 *   node src/utils/fixCustomerStats.js                 -> pratinjau selisih
 *   node src/utils/fixCustomerStats.js --apply         -> terapkan perbaikan
 *   node src/utils/fixCustomerStats.js --poin          -> pratinjau, termasuk poin
 *   node src/utils/fixCustomerStats.js --poin --apply  -> terapkan, termasuk poin
 *
 * Poin dihitung dari transaksi (didapat - dipakai). Jangan pakai --poin kalau kamu
 * pernah mengubah poin pelanggan secara manual.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Customer = require('../models/customer/Customer');
const Transaction = require('../models/transaction/Transaction');
const DebtPayment = require('../models/customer/DebtPayment');

async function remainingDebt(transaction) {
  const [row] = await DebtPayment.aggregate([
    { $match: { transaction: transaction._id } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } }
  ]);
  return Math.max(0, transaction.grandTotal - (transaction.downPayment || 0) - (row ? row.total : 0));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const withPoints = args.includes('--poin');

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI tidak ditemukan. Pastikan file .env ada di folder kasirku-backend');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(apply ? 'MODE: TERAPKAN perbaikan' : 'MODE: pratinjau (tidak mengubah data)');

  const customers = await Customer.find({});
  let changedCount = 0;

  for (const c of customers) {
    const txs = await Transaction.find({ customer: c._id, status: { $ne: 'dibatalkan' } });

    const computed = {
      totalTransactions: txs.length,
      totalSpent: txs.reduce((s, t) => s + t.grandTotal, 0),
      currentDebt: 0
    };
    for (const t of txs.filter(t => t.isDebt)) computed.currentDebt += await remainingDebt(t);
    if (withPoints) {
      computed.points = Math.max(0, txs.reduce((s, t) => s + (t.pointsEarned || 0) - (t.pointsUsed || 0), 0));
    }

    const diffs = Object.keys(computed).filter(k => (c[k] || 0) !== computed[k]);
    if (diffs.length === 0) continue;

    changedCount++;
    console.log(`- ${c.name}: ` + diffs.map(k => `${k} ${c[k] || 0} -> ${computed[k]}`).join(', '));
    if (apply) await Customer.updateOne({ _id: c._id }, { $set: computed });
  }

  console.log(changedCount === 0
    ? 'Semua data pelanggan sudah sesuai.'
    : `${changedCount} pelanggan ${apply ? 'diperbaiki' : 'perlu diperbaiki (jalankan lagi dengan --apply)'}.`);

  // Laporan saja (tidak dihapus): catatan pembayaran yang transaksinya sudah tidak ada
  const orphan = await DebtPayment.aggregate([
    { $lookup: { from: 'transactions', localField: 'transaction', foreignField: '_id', as: 't' } },
    { $match: { t: { $size: 0 } } },
    { $count: 'n' }
  ]);
  if (orphan[0]) console.log(`Catatan: ada ${orphan[0].n} catatan pembayaran hutang yang transaksinya sudah dihapus (tidak diubah).`);
}

main()
  .catch(err => { console.error('Gagal:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());