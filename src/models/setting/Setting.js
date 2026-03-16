const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  storeName: { type: String, default: 'KasirKu' },
  storeAddress: { type: String, default: '' },
  storePhone: { type: String, default: '' },
  storeEmail: { type: String, default: '' },
  storeDescription: { type: String, default: '' },
  currency: { type: String, default: 'Rp' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);