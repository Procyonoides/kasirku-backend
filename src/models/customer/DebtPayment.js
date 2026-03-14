const mongoose = require('mongoose');

const debtPaymentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  totalDebt: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  remainingDebt: { type: Number, required: true },
  paymentMethod: { type: String, default: 'tunai' },
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('DebtPayment', debtPaymentSchema);