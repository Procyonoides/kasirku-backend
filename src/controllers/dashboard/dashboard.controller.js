const Transaction = require('../../models/transaction/Transaction');
const Product = require('../../models/product/Product');
const Customer = require('../../models/customer/Customer');

exports.getStats = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayTx, monthTx, totalProducts, totalCustomers, debtors, lowStock] = await Promise.all([
      Transaction.find({ createdAt: { $gte: today, $lt: tomorrow }, status: 'selesai' }),
      Transaction.find({ createdAt: { $gte: monthStart }, status: 'selesai' }),
      Product.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ currentDebt: { $gt: 0 } }),
      Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$minStock'] } })
    ]);

    const todayRevenue = todayTx.reduce((s, t) => s + t.grandTotal, 0);
    const monthRevenue = monthTx.reduce((s, t) => s + t.grandTotal, 0);
    const todayProfit = todayTx.reduce((s, t) => {
      return s + t.items.reduce((ps, i) => ps + ((i.sellPrice - i.buyPrice) * i.qty), 0);
    }, 0);

    res.json({
      success: true,
      data: {
        today: { transactions: todayTx.length, revenue: todayRevenue, profit: todayProfit },
        month: { transactions: monthTx.length, revenue: monthRevenue },
        inventory: { total: totalProducts, lowStock },
        customers: { total: totalCustomers, debtors }
      }
    });
  } catch (err) { next(err); }
};

exports.salesChart = async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'selesai' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$grandTotal' },
        count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);

    res.json({ success: true, data: sales });
  } catch (err) { next(err); }
};

exports.getRecent = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ status: { $ne: 'dibatalkan' } })
      .populate('customer', 'name')
      .populate('cashier', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, data: transactions });
  } catch (err) { next(err); }
};