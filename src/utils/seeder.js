require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/user/User');
const Category = require('../models/category/Category');
const Product = require('../models/product/Product');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');

  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany()]);

  const owner = await User.create({
    name: 'Admin KasirKu',
    username: 'admin',
    password: 'kasirku123',
    role: 'owner'
  });
  console.log('✅ Owner created:', owner.username, '| password: kasirku123');

  const categories = await Category.insertMany([
    { name: 'Minuman', color: '#3B82F6', icon: 'local_drink' },
    { name: 'Makanan', color: '#EF4444', icon: 'restaurant' },
    { name: 'Snack', color: '#F59E0B', icon: 'cookie' },
    { name: 'Rokok', color: '#6B7280', icon: 'smoking_rooms' },
    { name: 'Sembako', color: '#10B981', icon: 'shopping_basket' }
  ]);

  await Product.insertMany([
    { name: 'Aqua 600ml', sku: 'PRD-00001', category: categories[0]._id, buyPrice: 2500, sellPrice: 3500, stock: 100, unit: 'botol' },
    { name: 'Indomie Goreng', sku: 'PRD-00002', category: categories[4]._id, buyPrice: 2800, sellPrice: 3500, stock: 50, unit: 'bungkus' },
    { name: 'Teh Botol 350ml', sku: 'PRD-00003', category: categories[0]._id, buyPrice: 3000, sellPrice: 4000, stock: 80, unit: 'botol' },
    { name: 'Chitato 68gr', sku: 'PRD-00004', category: categories[2]._id, buyPrice: 8500, sellPrice: 10000, stock: 30, unit: 'bungkus' },
    { name: 'Beng-Beng', sku: 'PRD-00005', category: categories[1]._id, buyPrice: 2000, sellPrice: 3000, stock: 60, unit: 'pcs' },
  ]);

  console.log('✅ Categories and products created');
  console.log('\n🎉 Seeding complete!');
  console.log('Login: admin@kasirku.com | Password: kasirku123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });