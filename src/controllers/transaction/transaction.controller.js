const Transaction = require('../../models/transaction/Transaction');
const Product = require('../../models/product/Product');
const Customer = require('../../models/customer/Customer');
const DebtPayment = require('../../models/customer/DebtPayment');
const mongoose = require('mongoose');
const PointHistory = require('../../models/customer/PointHistory');

// Escape karakter khusus regex supaya pencarian aman (mis. tanda kurung, titik)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Ringkasan penjualan per produk berdasarkan filter item (nama/SKU dan/atau kategori)
// Transaksi dibatalkan tidak dihitung, kecuali memang difilter status "dibatalkan"
const buildProductSummary = async (query, { productRegex, categoryProductIds }) => {
  const match = { ...query, status: query.status || { $ne: 'dibatalkan' } };
  if (match.customer) match.customer = new mongoose.Types.ObjectId(match.customer);

  // Syarat per item (setelah $unwind, nama field diawali "items.")
  const itemStage = {};
  if (categoryProductIds) itemStage['items.product'] = { $in: categoryProductIds };
  if (productRegex) {
    itemStage.$or = [{ 'items.productName': productRegex }, { 'items.productSku': productRegex }];
  }

  const [byProduct, transactionCount] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $match: itemStage },
      { $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        totalQty: { $sum: '$items.qty' },
        totalRevenue: { $sum: '$items.subtotal' }
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 50 }
    ]),
    Transaction.countDocuments(match)
  ]);

  return {
    totals: {
      totalQty: byProduct.reduce((s, p) => s + p.totalQty, 0),
      totalRevenue: byProduct.reduce((s, p) => s + p.totalRevenue, 0),
      transactionCount
    },
    byProduct
  };
};

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status, paymentMethod, product, category } = req.query;
    const query = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (req.query.customer) query.customer = req.query.customer;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    // Filter berdasarkan produk (nama/SKU) dan/atau kategori.
    // Item transaksi tidak menyimpan kategori, jadi dicari lewat daftar produk di kategori itu.
    // $elemMatch memastikan SATU item yang sama memenuhi semua syarat.
    let productRegex = null;
    let categoryProductIds = null;
    const itemMatch = {};

    if (category) {
      categoryProductIds = await Product.find({ category }).distinct('_id');
      itemMatch.product = { $in: categoryProductIds };
    }
    if (product && product.trim()) {
      productRegex = { $regex: escapeRegex(product.trim()), $options: 'i' };
      itemMatch.$or = [{ productName: productRegex }, { productSku: productRegex }];
    }
    const hasItemFilter = Object.keys(itemMatch).length > 0;
    if (hasItemFilter) query.items = { $elemMatch: itemMatch };

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('customer', 'name phone')
      .populate('cashier', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const response = { success: true, data: transactions, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } };
    if (hasItemFilter) response.productSummary = await buildProductSummary(query, { productRegex, categoryProductIds });

    res.json(response);
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
      .populate('customer')
      .populate('cashier', 'name')
      .populate({
        path: 'items.product',
        select: 'name sku category',
        populate: {
          path: 'category',
          select: 'name'
        }
      });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    res.json({ success: true, data: transaction });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, customerId, paymentMethod, amountPaid, discountPercent, taxPercent, notes, pointsUsed, downPayment: downPaymentInput } = req.body;

    let subtotal = 0;
    const transactionItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) throw new Error(`Produk tidak ditemukan.`);
      if (product.stock < item.qty) throw new Error(`Stok ${product.name} tidak mencukupi. Tersisa: ${product.stock}`);

      let sellPrice = product.sellPrice;
      let isCustomPrice = false;

      if (item.customPrice !== undefined && item.customPrice !== null && item.customPrice !== '') {
        const customPrice = Number(item.customPrice);
        if (isNaN(customPrice) || customPrice < 0) {
          throw new Error(`Harga custom untuk ${product.name} tidak valid.`);
        }
        sellPrice = customPrice;
        isCustomPrice = true;
      }

      const itemSubtotal = (sellPrice * item.qty) - (item.discount || 0);
      subtotal += itemSubtotal;

      transactionItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        qty: item.qty,
        buyPrice: product.buyPrice,
        sellPrice,
        originalPrice: product.sellPrice,
        isCustomPrice,
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

    // Uang muka (hutang sebagian): hanya berlaku untuk metode hutang
    const downPayment = isDebt ? Math.max(0, Number(downPaymentInput) || 0) : 0;
    if (isDebt && downPayment > 0 && downPayment >= grandTotal) {
      throw new Error('Uang muka harus kurang dari total. Untuk bayar penuh, pilih metode pembayaran Tunai.');
    }
    const debtAmount = isDebt ? grandTotal - downPayment : 0; // sisa yang benar-benar jadi hutang

    let customerName = 'Umum';
    if (customerId) {
      const customer = await Customer.findById(customerId).session(session);
      if (customer) {
        customerName = customer.name;
        if (isDebt) customer.currentDebt += debtAmount;
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
        downPayment,
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

    // Hutang yang sudah ada cicilan susulan tidak boleh dibatalkan
    if (transaction.paymentMethod === 'hutang') {
      const cicilan = await DebtPayment.countDocuments({ transaction: transaction._id });
      if (cicilan > 0) {
        return res.status(400).json({
          success: false,
          message: 'Transaksi hutang yang sudah ada pembayaran cicilan tidak bisa dibatalkan.'
        });
      }
    }

    for (const item of transaction.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }

    // Pelanggan terdaftar: balikkan statistik, saldo hutang, dan poin dari transaksi ini
    if (transaction.customer) {
      const customer = await Customer.findById(transaction.customer);
      if (customer) {
        if (transaction.isDebt) {
          customer.currentDebt = Math.max(0, customer.currentDebt - (transaction.grandTotal - (transaction.downPayment || 0)));
        }
        customer.totalTransactions = Math.max(0, customer.totalTransactions - 1);
        customer.totalSpent = Math.max(0, customer.totalSpent - transaction.grandTotal);

        // Poin yang dipakai dikembalikan
        const pointsUsed = transaction.pointsUsed || 0;
        if (pointsUsed > 0) {
          await PointHistory.create({
            customer: customer._id,
            transaction: transaction._id,
            type: 'earned',
            points: pointsUsed,
            description: `Poin dikembalikan (pembatalan ${transaction.invoiceNumber})`,
            balanceBefore: customer.points,
            balanceAfter: customer.points + pointsUsed
          });
          customer.points += pointsUsed;
        }

        // Poin yang didapat dari transaksi ini ditarik kembali
        const pointsEarned = transaction.pointsEarned || 0;
        if (pointsEarned > 0) {
          const balanceAfter = Math.max(0, customer.points - pointsEarned);
          await PointHistory.create({
            customer: customer._id,
            transaction: transaction._id,
            type: 'used',
            points: customer.points - balanceAfter,
            description: `Poin dibatalkan (pembatalan ${transaction.invoiceNumber})`,
            balanceBefore: customer.points,
            balanceAfter
          });
          customer.points = balanceAfter;
        }

        await customer.save();
      }
    }

    transaction.status = 'dibatalkan';
    transaction.isDebt = false;
    await transaction.save();
    res.json({ success: true, message: 'Transaksi dibatalkan dan stok dikembalikan.' });
  } catch (err) { next(err); }
};

// Hapus permanen — SENGAJA dibatasi ketat:
// - hanya owner
// - hanya transaksi yang statusnya sudah 'dibatalkan'
// Transaksi 'selesai'/'hutang' tidak pernah boleh dihapus permanen,
// supaya laporan keuangan & riwayat pelanggan tetap konsisten.
exports.remove = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });

    if (transaction.status !== 'dibatalkan') {
      return res.status(400).json({
        success: false,
        message: 'Hanya transaksi berstatus "dibatalkan" yang bisa dihapus permanen. Batalkan transaksi ini dulu.'
      });
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Transaksi berhasil dihapus permanen.' });
  } catch (err) { next(err); }
};

// Total semua pembayaran hutang yang sudah masuk untuk satu transaksi
const getTotalDebtPaid = async (transactionId) => {
  const [row] = await DebtPayment.aggregate([
    { $match: { transaction: new mongoose.Types.ObjectId(transactionId) } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } }
  ]);
  return row ? row.total : 0;
};

// Info hutang satu transaksi: total, sudah dibayar, sisa, dan riwayat pembayaran
exports.getDebtInfo = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction || transaction.paymentMethod !== 'hutang') {
      return res.status(404).json({ success: false, message: 'Data hutang tidak ditemukan.' });
    }

    const payments = await DebtPayment.find({ transaction: transaction._id })
      .populate('recordedBy', 'name')
      .sort({ createdAt: 1 });
    const downPayment = transaction.downPayment || 0;
    const totalPaid = downPayment + payments.reduce((s, p) => s + p.amountPaid, 0);

    res.json({
      success: true,
      data: {
        invoiceNumber: transaction.invoiceNumber,
        customerName: transaction.customerName,
        notes: transaction.notes,
        status: transaction.status,
        isDebt: transaction.isDebt,
        grandTotal: transaction.grandTotal,
        downPayment,
        totalPaid,
        remaining: Math.max(0, transaction.grandTotal - totalPaid),
        payments
      }
    });
  } catch (err) { next(err); }
};

exports.payDebt = async (req, res, next) => {
  try {
    const { paymentMethod = 'tunai', notes = '' } = req.body;
    const amountPaid = Number(req.body.amountPaid);

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal pembayaran harus lebih dari 0.' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction || !transaction.isDebt) {
      return res.status(404).json({ success: false, message: 'Data hutang tidak ditemukan.' });
    }
    if (transaction.status === 'dibatalkan') {
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah dibatalkan.' });
    }

    // Sisa hutang dihitung dari SEMUA pembayaran sebelumnya, bukan hanya pembayaran ini
    const debtTotal = transaction.grandTotal - (transaction.downPayment || 0); // yang benar-benar berhutang
    const paidBefore = await getTotalDebtPaid(transaction._id);
    const remainingBefore = debtTotal - paidBefore;

    if (amountPaid > remainingBefore) {
      return res.status(400).json({
        success: false,
        message: `Nominal melebihi sisa hutang (Rp ${remainingBefore.toLocaleString('id-ID')}).`
      });
    }

    const remaining = remainingBefore - amountPaid;
    if (remaining <= 0) {
      transaction.status = 'selesai';
      transaction.isDebt = false;
      transaction.debtPaidAt = new Date();
    }

    if (transaction.customer) {
      await Customer.findByIdAndUpdate(transaction.customer, { $inc: { currentDebt: -amountPaid } });
    }

    await DebtPayment.create({
      customer: transaction.customer || null,
      transaction: transaction._id,
      totalDebt: debtTotal,
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