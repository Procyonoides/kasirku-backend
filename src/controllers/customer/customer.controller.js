const Customer = require('../../models/customer/Customer');
const Transaction = require('../../models/transaction/Transaction');

exports.getAll = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query).sort('name').skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: customers, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getDebtors = async (req, res, next) => {
  try {
    const customers = await Customer.find({ isActive: true, currentDebt: { $gt: 0 } }).sort({ currentDebt: -1 });
    const totalDebt = customers.reduce((s, c) => s + c.currentDebt, 0);
    res.json({ success: true, data: customers, totalDebt });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ customer: req.params.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: transactions });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Pelanggan dihapus.' });
  } catch (err) { next(err); }
};