const Transaction = require('../../models/transaction/Transaction');
const Finance = require('../../models/finance/Finance');

exports.salesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59)) : new Date();
    const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const data = await Transaction.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: 'selesai' } },
      { $group: {
        _id: { $dateToString: { format, date: '$createdAt' } },
        revenue: { $sum: '$grandTotal' },
        transactions: { $sum: 1 },
        items: { $sum: {
          $reduce: {
            input: '$items', initialValue: 0,
            in: { $add: ['$$value', '$$this.qty'] }
          }
        }},
        profit: { $sum: {
          $reduce: {
            input: '$items', initialValue: 0,
            in: { $add: ['$$value', { $multiply: [{ $subtract: ['$$this.sellPrice', '$$this.buyPrice'] }, '$$this.qty'] }] }
          }
        }}
      }},
      { $sort: { '_id': 1 } }
    ]);

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.profitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59)) : new Date();

    const [salesData, expenses, income] = await Promise.all([
      Transaction.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'selesai' } },
        { $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalCOGS: { $sum: {
            $reduce: { input: '$items', initialValue: 0,
              in: { $add: ['$$value', { $multiply: ['$$this.buyPrice', '$$this.qty'] }] }
            }
          }}
        }}
      ]),
      Finance.aggregate([
        { $match: { type: 'pengeluaran', date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      Finance.aggregate([
        { $match: { type: 'pemasukan', date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ])
    ]);

    const revenue = salesData[0]?.totalRevenue || 0;
    const cogs = salesData[0]?.totalCOGS || 0;
    const grossProfit = revenue - cogs;
    const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);
    const totalOtherIncome = income.reduce((s, i) => s + i.total, 0);
    const netProfit = grossProfit - totalExpenses + totalOtherIncome;

    res.json({ success: true, data: { revenue, cogs, grossProfit, expenses, totalExpenses, otherIncome: income, totalOtherIncome, netProfit, period: { start, end } } });
  } catch (err) { next(err); }
};

exports.topProducts = async (req, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59)) : new Date();

    const data = await Transaction.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: 'selesai' } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        totalQty: { $sum: '$items.qty' },
        totalRevenue: { $sum: '$items.subtotal' },
        totalProfit: { $sum: { $multiply: [{ $subtract: ['$items.sellPrice', '$items.buyPrice'] }, '$items.qty'] } }
      }},
      { $sort: { totalQty: -1 } },
      { $limit: Number(limit) }
    ]);

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.cashflow = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59)) : new Date();

    const financeRecords = await Finance.find({ 
      date: { $gte: start, $lte: end } 
    }).sort('date');

    // Hitung per hari
    const dailyMap = {};
    financeRecords.forEach(r => {
      const day = r.date.toISOString().split('T')[0];
      
      // Inisialisasi dengan items[] sekalian
      if (!dailyMap[day]) {
        dailyMap[day] = { _id: day, income: 0, expense: 0, net: 0, items: [] };
      }
      
      if (r.type === 'pemasukan') dailyMap[day].income += r.amount;
      else dailyMap[day].expense += r.amount;
      dailyMap[day].net = dailyMap[day].income - dailyMap[day].expense;
      
      // Push item detail
      dailyMap[day].items.push({
        type: r.type,
        category: r.category,
        description: r.description,
        amount: r.amount
      });
    });

    const daily = Object.values(dailyMap).sort((a, b) => a._id.localeCompare(b._id));
    const totalIncome = financeRecords
      .filter(r => r.type === 'pemasukan')
      .reduce((s, r) => s + r.amount, 0);
    const totalExpense = financeRecords
      .filter(r => r.type === 'pengeluaran')
      .reduce((s, r) => s + r.amount, 0);

    res.json({ 
      success: true, 
      data: { 
        totalIncome, 
        totalExpense, 
        netCashflow: totalIncome - totalExpense,
        daily 
      } 
    });
  } catch (err) { next(err); }
};