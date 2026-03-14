const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  creditLimit: { type: Number, default: 0 },
  currentDebt: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastTransactionAt: { type: Date, default: null },
  points: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

customerSchema.virtual('customerTier').get(function () {
  if (this.totalSpent >= 10000000) return 'platinum';
  if (this.totalSpent >= 5000000) return 'gold';
  if (this.totalSpent >= 1000000) return 'silver';
  return 'regular';
});

customerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Customer', customerSchema);