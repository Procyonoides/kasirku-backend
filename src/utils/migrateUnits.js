/**
 * Migrasi data lama: field `unit` di Product dulunya teks bebas
 * (contoh: "pcs", "kg", "botol"), sekarang jadi referensi ke koleksi Unit.
 *
 * Script ini:
 * 1. Membaca semua produk langsung dari koleksi mentah (bypass validasi
 *    schema Mongoose, karena schema sekarang mengharapkan ObjectId).
 * 2. Mengumpulkan semua nilai unit unik yang berupa teks (string).
 * 3. Membuat dokumen Unit baru untuk tiap nilai unik tsb (skip kalau
 *    sudah ada Unit dengan nama yang sama).
 * 4. Update tiap produk: ganti field `unit` dari string ke ObjectId
 *    Unit yang sesuai.
 *
 * AMAN dijalankan berkali-kali (idempotent) — produk yang unit-nya
 * sudah berupa ObjectId akan dilewati.
 *
 * Cara pakai:
 *   node src/utils/migrateUnits.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Unit = require('../models/unit/Unit');

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');

  const productsCollection = mongoose.connection.collection('products');
  const allProducts = await productsCollection.find({}).toArray();

  console.log(`Ditemukan ${allProducts.length} produk.`);

  // Pisahkan produk yang unit-nya masih string vs yang sudah ObjectId/kosong
  const needsMigration = allProducts.filter(p => typeof p.unit === 'string' && p.unit.trim() !== '');

  if (needsMigration.length === 0) {
    console.log('✅ Tidak ada produk dengan unit bertipe string. Migrasi tidak diperlukan.');
    process.exit(0);
  }

  console.log(`${needsMigration.length} produk perlu dimigrasi.`);

  // Kumpulkan nama unit unik
  const uniqueNames = [...new Set(needsMigration.map(p => p.unit.trim()))];
  console.log('Satuan unik ditemukan:', uniqueNames);

  // Buat Unit baru untuk tiap nama, atau pakai yang sudah ada
  const nameToId = {};
  for (const name of uniqueNames) {
    let unit = await Unit.findOne({ name });
    if (!unit) {
      unit = await Unit.create({ name });
      console.log(`  + Dibuat Unit baru: "${name}" (${unit._id})`);
    } else {
      console.log(`  = Pakai Unit yang sudah ada: "${name}" (${unit._id})`);
    }
    nameToId[name] = unit._id;
  }

  // Update tiap produk
  let updatedCount = 0;
  for (const p of needsMigration) {
    const newUnitId = nameToId[p.unit.trim()];
    await productsCollection.updateOne(
      { _id: p._id },
      { $set: { unit: newUnitId } }
    );
    updatedCount++;
  }

  console.log(`✅ ${updatedCount} produk berhasil dimigrasi.`);
  console.log('🎉 Migrasi selesai. Silakan cek menu Produk & Kelola Satuan.');
  process.exit(0);
};

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
