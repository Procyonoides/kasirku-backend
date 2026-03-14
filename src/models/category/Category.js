const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: 'tag' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);