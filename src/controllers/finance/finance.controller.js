const Finance = require('../../models/finance/Finance');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, category, startDate, endDate } = req.query;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const total = await Finance.countDocuments(query);
    const records = await Finance.find(query)
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: records, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59)) : new Date();

    const summary = await Finance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    const income = summary.find(s => s._id === 'pemasukan')?.total || 0;
    const expense = summary.find(s => s._id === 'pengeluaran')?.total || 0;
    res.json({ success: true, data: { income, expense, balance: income - expense } });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const record = await Finance.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const record = await Finance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Finance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Catatan keuangan dihapus.' });
  } catch (err) { next(err); }
};