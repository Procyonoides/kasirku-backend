/**
 * Aturan laporan: omzet dihitung saat transaksi LUNAS.
 * - Transaksi biasa  -> tanggal penjualan (createdAt)
 * - Transaksi hutang -> tanggal dilunasi (debtPaidAt)
 * Hutang yang belum lunas (status "hutang") tidak ikut dihitung.
 */

// Kondisi query: transaksi lunas yang tanggal lunasnya jatuh di antara start dan end
const settledBetween = (start, end = new Date(8.64e15)) => ({
  status: 'selesai',
  $or: [
    { debtPaidAt: { $gte: start, $lte: end } },
    { debtPaidAt: null, createdAt: { $gte: start, $lte: end } }
  ]
});

// Ekspresi aggregate: tanggal efektif transaksi (untuk $group / $dateToString)
const settledDate = { $ifNull: ['$debtPaidAt', '$createdAt'] };

module.exports = { settledBetween, settledDate };