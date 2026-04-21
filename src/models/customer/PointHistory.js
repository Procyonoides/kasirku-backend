const mongoose = require('mongoose');

const pointHistorySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  type: { type: String, enum: ['earned', 'used'], required: true },
  points: { type: Number, required: true },
  description: { type: String, default: '' },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('PointHistory', pointHistorySchema);