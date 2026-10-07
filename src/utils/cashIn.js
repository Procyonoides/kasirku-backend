/**
 * Kas masuk: uang yang benar-benar diterima pada suatu periode.
 *  - Penjualan non-hutang  -> saat transaksi dibuat (per metode pembayaran)
 *  - Uang muka hutang      -> saat transaksi dibuat (dianggap tunai, karena metodenya belum dicatat)
 *  - Cicilan hutang        -> saat cicilan dibayar (per metode pembayaran)
 * Hutang yang belum dibayar tidak dihitung. Transaksi dibatalkan tidak dihitung.
 */
const Transaction = require('../models/transaction/Transaction');
const DebtPayment = require('../models/customer/DebtPayment');

// Gabungkan hasil agregasi menjadi baris per metode pembayaran
const buildCashInRows = (salesRows, downPaymentTotal, installmentRows) => {
  const map = {};
  const ensure = (method) => {
    if (!map[method]) map[method] = { method, sales: 0, downPayment: 0, installments: 0, total: 0 };
    return map[method];
  };

  salesRows.forEach(r => { ensure(r._id).sales += r.total; });
  if (downPaymentTotal > 0) ensure('tunai').downPayment += downPaymentTotal;
  installmentRows.forEach(r => { ensure(r._id).installments += r.total; });

  const rows = Object.values(map)
    .map(r => ({ ...r, total: r.sales + r.downPayment + r.installments }))
    .sort((a, b) => b.total - a.total);

  const totals = rows.reduce((t, r) => ({
    sales: t.sales + r.sales,
    downPayment: t.downPayment + r.downPayment,
    installments: t.installments + r.installments,
    total: t.total + r.total
  }), { sales: 0, downPayment: 0, installments: 0, total: 0 });

  return { rows, totals };
};

const getCashIn = async (start, end) => {
  const range = { $gte: start, $lte: end };

  const [salesRows, [downPayment], installmentRows] = await Promise.all([
    Transaction.aggregate([
      { $match: { createdAt: range, status: 'selesai', paymentMethod: { $ne: 'hutang' } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$grandTotal' } } }
    ]),
    Transaction.aggregate([
      { $match: { createdAt: range, paymentMethod: 'hutang', status: { $ne: 'dibatalkan' }, downPayment: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$downPayment' } } }
    ]),
    DebtPayment.aggregate([
      { $match: { createdAt: range } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amountPaid' } } }
    ])
  ]);

  return buildCashInRows(salesRows, downPayment ? downPayment.total : 0, installmentRows);
};

module.exports = { getCashIn, buildCashInRows };