const Transaction = require('../../models/transaction/Transaction');
const Product = require('../../models/product/Product');
const Customer = require('../../models/customer/Customer');
const DebtPayment = require('../../models/customer/DebtPayment');
const mongoose = require('mongoose');
const PointHistory = require('../../models/customer/PointHistory');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status, paymentMethod } = req.query;
    const query = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (req.query.customer) query.customer = req.query.customer;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('customer', 'name phone')
      .populate('cashier', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: transactions, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getToday = async (req, res, next) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({ createdAt: { $gte: start, $lte: end }, status: 'selesai' })
      .populate('customer', 'name').sort({ createdAt: -1 });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalProfit = transactions.reduce((sum, t) => {
      return sum + t.items.reduce((s, i) => s + ((i.sellPrice - i.buyPrice) * i.qty), 0);
    }, 0);

    res.json({ success: true, data: transactions, summary: { total: transactions.length, totalRevenue, totalProfit } });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer').populate('cashier', 'name').populate('items.product', 'name sku');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    res.json({ success: true, data: transaction });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, customerId, paymentMethod, amountPaid, discountPercent, taxPercent, notes, pointsUsed } = req.body;

    let subtotal = 0;
    const transactionItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) throw new Error(`Produk tidak ditemukan.`);
      if (product.stock < item.qty) throw new Error(`Stok ${product.name} tidak mencukupi. Tersisa: ${product.stock}`);

      const itemSubtotal = (product.sellPrice * item.qty) - (item.discount || 0);
      subtotal += itemSubtotal;

      transactionItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        qty: item.qty,
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        discount: item.discount || 0,
        subtotal: itemSubtotal
      });

      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.qty } }, { session });
    }

    const discountAmount = subtotal * ((discountPercent || 0) / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * ((taxPercent || 0) / 100);

    // Hitung diskon dari poin
    const pointsToUse = pointsUsed || 0;
    if (customerId && pointsToUse > 0) {
      const customer = await Customer.findById(customerId).session(session);
      if (customer && pointsToUse > customer.points) {
        throw new Error('Poin tidak mencukupi.');
      }
    }
    const pointsDiscount = pointsToUse * 100; // 1 poin = Rp 100
    const grandTotal = Math.max(0, afterDiscount + taxAmount - pointsDiscount);

    const isDebt = paymentMethod === 'hutang';
    const change = isDebt ? 0 : Math.max(0, (amountPaid || 0) - grandTotal);

    let customerName = 'Umum';
    if (customerId) {
      const customer = await Customer.findById(customerId).session(session);
      if (customer) {
        customerName = customer.name;
        if (isDebt) customer.currentDebt += grandTotal;
        customer.totalTransactions += 1;
        customer.totalSpent += grandTotal;
        customer.lastTransactionAt = new Date();

        const pointsEarned = Math.floor(grandTotal / 10000);
        const balanceBefore = customer.points;

        // Kurangi poin yang dipakai
        if (pointsToUse > 0) {
          await PointHistory.create([{
            customer: customer._id,
            transaction: null,
            type: 'used',
            points: pointsToUse,
            description: 'Penukaran poin',
            balanceBefore: balanceBefore,
            balanceAfter: balanceBefore - pointsToUse
          }], { session });
          customer.points -= pointsToUse;
        }

        // Tambah poin dari transaksi
        if (pointsEarned > 0) {
          await PointHistory.create([{
            customer: customer._id,
            transaction: null,
            type: 'earned',
            points: pointsEarned,
            description: 'Poin dari transaksi',
            balanceBefore: customer.points,
            balanceAfter: customer.points + pointsEarned
          }], { session });
          customer.points += pointsEarned;
        }

        if (customer.points < 0) customer.points = 0;
        await customer.save({ session });
      }
    }

    const transaction = new Transaction({
        items: transactionItems,
        customer: customerId || null,
        customerName,
        subtotal,
        discountTotal: discountAmount,
        discountPercent: discountPercent || 0,
        tax: taxAmount,
        taxPercent: taxPercent || 0,
        grandTotal,
        paymentMethod,
        amountPaid: amountPaid || grandTotal,
        change,
        isDebt,
        status: isDebt ? 'hutang' : 'selesai',
        notes,
        pointsUsed: pointsToUse,
        pointsEarned: Math.floor(grandTotal / 10000),
        pointsDiscount,
        cashier: req.user._id
    });

    await transaction.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, message: 'Transaksi berhasil.', data: transaction });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    if (transaction.status === 'dibatalkan') return res.status(400).json({ success: false, message: 'Transaksi sudah dibatalkan.' });

    for (const item of transaction.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }

    transaction.status = 'dibatalkan';
    await transaction.save();
    res.json({ success: true, message: 'Transaksi dibatalkan dan stok dikembalikan.' });
  } catch (err) { next(err); }
};

exports.payDebt = async (req, res, next) => {
  try {
    const { amountPaid, paymentMethod, notes } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction || !transaction.isDebt) return res.status(404).json({ success: false, message: 'Data hutang tidak ditemukan.' });

    const remaining = transaction.grandTotal - amountPaid;
    if (remaining <= 0) {
      transaction.status = 'selesai';
      transaction.isDebt = false;
      transaction.debtPaidAt = new Date();
    }

    if (transaction.customer) {
      await Customer.findByIdAndUpdate(transaction.customer, { $inc: { currentDebt: -amountPaid } });
    }

    await DebtPayment.create({
      customer: transaction.customer,
      transaction: transaction._id,
      totalDebt: transaction.grandTotal,
      amountPaid,
      remainingDebt: Math.max(0, remaining),
      paymentMethod,
      notes,
      recordedBy: req.user._id
    });

    await transaction.save();
    res.json({ success: true, message: 'Pembayaran hutang berhasil dicatat.', remainingDebt: Math.max(0, remaining) });
  } catch (err) { next(err); }
};