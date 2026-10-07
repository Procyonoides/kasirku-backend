/**
 * Kas masuk: uang yang benar-benar diterima pada suatu periode.
 *  - Penjualan non-hutang  -> saat transaksi dibuat (per metode pembayaran)
 *  - Uang muka hutang      -> saat transaksi dibuat (dianggap tunai, karena metodenya belum dicatat)
 *  - Cicilan hutang        -> saat cicilan dibayar (per metode pembayaran)
 *  - Pemasukan lain        -> catatan pemasukan di menu Keuangan (modal, pinjaman, kembalian tidak diambil, dll)
 * Hutang yang belum dibayar tidak dihitung. Transaksi dibatalkan tidak dihitung.
 *
 * Kategori "penjualan" dan "piutang_masuk" di Keuangan tidak dihitung lagi di sini,
 * karena penjualan dan cicilan sudah dicatat otomatis dari transaksi (supaya tidak dobel).
 */
const Transaction = require('../models/transaction/Transaction');
const DebtPayment = require('../models/customer/DebtPayment');
const Finance = require('../models/finance/Finance');

// Gabungkan hasil agregasi menjadi baris per metode pembayaran
const buildCashInRows = (salesRows, downPaymentTotal, installmentRows, otherRows = []) => {
  const map = {};
  const ensure = (method) => {
    if (!map[method]) map[method] = { method, sales: 0, downPayment: 0, installments: 0, otherIncome: 0, total: 0 };
    return map[method];
  };

  salesRows.forEach(r => { ensure(r._id).sales += r.total; });
  if (downPaymentTotal > 0) ensure('tunai').downPayment += downPaymentTotal;
  installmentRows.forEach(r => { ensure(r._id).installments += r.total; });
  otherRows.forEach(r => { ensure(r._id || 'tunai').otherIncome += r.total; });

  const rows = Object.values(map)
    .map(r => ({ ...r, total: r.sales + r.downPayment + r.installments + r.otherIncome }))
    .sort((a, b) => b.total - a.total);

  const totals = rows.reduce((t, r) => ({
    sales: t.sales + r.sales,
    downPayment: t.downPayment + r.downPayment,
    installments: t.installments + r.installments,
    otherIncome: t.otherIncome + r.otherIncome,
    total: t.total + r.total
  }), { sales: 0, downPayment: 0, installments: 0, otherIncome: 0, total: 0 });

  return { rows, totals };
};

const getCashIn = async (start, end) => {
  const range = { $gte: start, $lte: end };

  const [salesRows, [downPayment], installmentRows, otherRows] = await Promise.all([
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
    ]),
    Finance.aggregate([
      { $match: { type: 'pemasukan', date: range, category: { $nin: ['penjualan', 'piutang_masuk'] } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' } } }
    ])
  ]);

  return buildCashInRows(salesRows, downPayment ? downPayment.total : 0, installmentRows, otherRows);
};

// ---------------------------------------------------------------------------
// Untuk Cashflow: kas masuk otomatis per hari, dalam bentuk entri siap digabung
// ---------------------------------------------------------------------------
const METHOD_LABEL = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', kartu_debit: 'Kartu Debit', kartu_kredit: 'Kartu Kredit' };
const methodLabel = (m) => METHOD_LABEL[m] || m;

// Kunci hari "YYYY-MM-DD" menurut waktu Jakarta (bukan UTC)
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

// Kategori yang dicatat otomatis dari kasir (tidak boleh dihitung dari catatan manual di Keuangan)
const AUTO_CATEGORIES = ['penjualan', 'piutang_masuk'];

const buildCashInEntries = (sales, downPayments, installments) => {
  const groups = {};
  const add = (day, category, label, unit, amount) => {
    const key = `${day}|${category}|${label}`;
    if (!groups[key]) groups[key] = { day, category, label, unit, amount: 0, count: 0 };
    groups[key].amount += amount;
    groups[key].count += 1;
  };

  sales.forEach(t => add(dayKey(t.createdAt), 'penjualan', `Penjualan ${methodLabel(t.paymentMethod)}`, 'transaksi', t.grandTotal));
  downPayments.forEach(t => add(dayKey(t.createdAt), 'penjualan', 'Uang muka hutang', 'transaksi', t.downPayment));
  installments.forEach(p => add(dayKey(p.createdAt), 'piutang_masuk', `Cicilan hutang ${methodLabel(p.paymentMethod)}`, 'pembayaran', p.amountPaid));

  return Object.values(groups).map(g => ({
    day: g.day,
    type: 'pemasukan',
    category: g.category,
    description: `${g.label} (${g.count} ${g.unit})`,
    amount: g.amount
  }));
};

const getCashInEntries = async (start, end) => {
  const range = { $gte: start, $lte: end };
  const [sales, downPayments, installments] = await Promise.all([
    Transaction.find({ createdAt: range, status: 'selesai', paymentMethod: { $ne: 'hutang' } }).select('createdAt paymentMethod grandTotal'),
    Transaction.find({ createdAt: range, paymentMethod: 'hutang', status: { $ne: 'dibatalkan' }, downPayment: { $gt: 0 } }).select('createdAt downPayment'),
    DebtPayment.find({ createdAt: range }).select('createdAt paymentMethod amountPaid')
  ]);
  return buildCashInEntries(sales, downPayments, installments);
};

// Susun data Cashflow dari daftar entri (manual + otomatis), dikelompokkan per hari
const buildCashflow = (entries) => {
  const dailyMap = {};
  entries.forEach(e => {
    if (!dailyMap[e.day]) dailyMap[e.day] = { _id: e.day, income: 0, expense: 0, net: 0, items: [] };
    const d = dailyMap[e.day];
    if (e.type === 'pemasukan') d.income += e.amount; else d.expense += e.amount;
    d.net = d.income - d.expense;
    d.items.push({ type: e.type, category: e.category, description: e.description, amount: e.amount });
  });

  const daily = Object.values(dailyMap).sort((a, b) => a._id.localeCompare(b._id));
  const totalIncome = entries.filter(e => e.type === 'pemasukan').reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type !== 'pemasukan').reduce((s, e) => s + e.amount, 0);
  return { totalIncome, totalExpense, netCashflow: totalIncome - totalExpense, daily };
};

module.exports = { getCashIn, buildCashInRows, getCashInEntries, buildCashInEntries, buildCashflow, dayKey, AUTO_CATEGORIES };