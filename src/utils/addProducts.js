/**
 * perintah.js - Tambah produk dummy untuk uji coba tampilan / paginasi POS.
 *
 * AMAN: hanya MENAMBAH data. Tidak menghapus produk, user, atau transaksi yang sudah ada.
 * Semua produk dummy diberi SKU berawalan "DUMMY-" supaya mudah dikenali & dihapus.
 *
 * Cara pakai (jalankan dari folder kasirku-backend):
 *   node perintah.js            -> tambah 100 produk dummy
 *   node perintah.js 50         -> tambah 50 produk dummy
 *   node perintah.js 1000       -> tambah 1000 produk dummy (nama diberi nomor urut)
 *   node perintah.js 50 --dry   -> hanya tampilkan pratinjau, TIDAK menyimpan ke database
 *   node perintah.js hapus      -> hapus semua produk dummy (SKU DUMMY-*)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Category = require('../models/category/Category');
const Unit = require('../models/unit/Unit');
const Product = require('../models/product/Product');

const SKU_PREFIX = 'DUMMY-';

// [nama, harga jual, satuan]
const CATALOG = {
  Minuman: {
    color: '#3B82F6', icon: 'local_drink',
    items: [
      ['Aqua 600ml', 3500, 'botol'], ['Aqua 1500ml', 6000, 'botol'], ['Le Minerale 600ml', 3500, 'botol'],
      ['Teh Pucuk Harum 350ml', 4000, 'botol'], ['Teh Botol Sosro 350ml', 4500, 'botol'], ['Pocari Sweat 500ml', 7500, 'botol'],
      ['Mizone 500ml', 6500, 'botol'], ['Fanta Strawberry 390ml', 5000, 'botol'], ['Coca-Cola 390ml', 5000, 'botol'],
      ['Sprite 390ml', 5000, 'botol'], ['Floridina Orange 360ml', 4000, 'botol'], ['You C1000 Vitamin 140ml', 8000, 'botol'],
      ['Ultra Milk Coklat 200ml', 5500, 'pcs'], ['Frisian Flag Coklat 225ml', 6000, 'pcs'], ['Susu Bear Brand 189ml', 11000, 'pcs'],
      ['Kapal Api Special Mix Sachet', 1500, 'bungkus'], ['Good Day Cappuccino Sachet', 2000, 'bungkus'], ['Nescafe Original Kaleng 240ml', 10000, 'pcs'],
      ['Pop Ice Coklat Sachet', 1500, 'bungkus'], ['Kopi ABC Susu Sachet', 1500, 'bungkus']
    ]
  },
  Makanan: {
    color: '#EF4444', icon: 'restaurant',
    items: [
      ['Indomie Goreng', 3500, 'bungkus'], ['Indomie Soto', 3500, 'bungkus'], ['Indomie Ayam Bawang', 3500, 'bungkus'],
      ['Mie Sedaap Goreng', 3500, 'bungkus'], ['Mie Sedaap Kari Ayam', 3500, 'bungkus'], ['Supermie Ayam Bawang', 3000, 'bungkus'],
      ['Sarimi Isi 2 Ayam Kecap', 3500, 'bungkus'], ['Pop Mie Ayam', 6000, 'pcs'], ['Pop Mie Baso Sapi', 6000, 'pcs'],
      ['Sarden ABC 155gr', 14000, 'pcs'], ['Kornet Pronas 198gr', 22000, 'pcs'], ['Roti Tawar Sari Roti', 16000, 'bungkus'],
      ['Roti Sobek Coklat', 13000, 'bungkus'], ['Bubur Instan Sun Ayam', 5000, 'bungkus'], ['Nugget Ayam Fiesta 250gr', 28000, 'bungkus'],
      ['Sosis So Nice Ayam', 5000, 'pcs'], ['Abon Sapi 100gr', 15000, 'bungkus'], ['Kerupuk Udang 500gr', 18000, 'bungkus'],
      ['Bakso Ikan 250gr', 17000, 'bungkus'], ['Mie Telur Cap 3 Ayam', 3500, 'bungkus']
    ]
  },
  Snack: {
    color: '#F59E0B', icon: 'cookie',
    items: [
      ['Chitato Sapi Panggang 68gr', 10000, 'bungkus'], ['Lays Classic 68gr', 10500, 'bungkus'], ['Qtela Singkong Balado 60gr', 8000, 'bungkus'],
      ['Taro Net Seaweed 36gr', 5000, 'bungkus'], ['Cheetos Jagung Bakar', 5000, 'bungkus'], ['Potabee BBQ 68gr', 9500, 'bungkus'],
      ['Oreo Original', 9000, 'bungkus'], ['Biskuat Coklat', 6000, 'bungkus'], ['Good Time Choco Chip', 7000, 'bungkus'],
      ['Tango Wafer Coklat', 5500, 'bungkus'], ['Beng-Beng', 3000, 'pcs'], ['Silverqueen Almond 30gr', 12000, 'pcs'],
      ['Chocolatos Wafer', 2500, 'pcs'], ['Pocky Strawberry', 9000, 'pcs'], ['Richeese Nabati Wafer', 2000, 'pcs'],
      ['Roma Kelapa', 8000, 'bungkus'], ['Regal Marie', 9500, 'bungkus'], ['Astor Wafer Roll Coklat', 7000, 'bungkus'],
      ['Gery Saluut Malkist Coklat', 2500, 'pcs'], ['Kacang Garuda Kulit 100gr', 8000, 'bungkus']
    ]
  },
  Rokok: {
    color: '#6B7280', icon: 'smoking_rooms',
    items: [
      ['Gudang Garam Surya 12', 27000, 'bungkus'], ['Gudang Garam Filter 12', 24000, 'bungkus'], ['Sampoerna Mild 16', 33000, 'bungkus'],
      ['Djarum Super 12', 25000, 'bungkus'], ['Djarum Black 12', 23000, 'bungkus'], ['LA Lights 16', 31000, 'bungkus'],
      ['LA Bold 16', 32000, 'bungkus'], ['Marlboro Merah 20', 40000, 'bungkus'], ['Marlboro Black Menthol 20', 41000, 'bungkus'],
      ['Dunhill Filter 16', 35000, 'bungkus'], ['Surya Pro Mild 16', 30000, 'bungkus'], ['U Mild 16', 29000, 'bungkus'],
      ['Class Mild 16', 28000, 'bungkus'], ['Wismilak Diplomat 12', 22000, 'bungkus'], ['Bentoel Biru 16', 26000, 'bungkus'],
      ['Star Mild 16', 24000, 'bungkus'], ['Sampoerna Kretek 12', 20000, 'bungkus'], ['Gudang Garam Signature 12', 25000, 'bungkus'],
      ['Esse Change 16', 36000, 'bungkus'], ['Camel Filter 20', 38000, 'bungkus']
    ]
  },
  Sembako: {
    color: '#10B981', icon: 'shopping_basket',
    items: [
      ['Beras Premium 5kg', 72000, 'bungkus'], ['Beras Medium 1kg', 14000, 'kg'], ['Gula Pasir 1kg', 17000, 'kg'],
      ['Minyak Goreng Bimoli 1L', 20000, 'liter'], ['Minyak Goreng Sania 2L', 38000, 'liter'], ['Tepung Terigu Segitiga Biru 1kg', 14000, 'kg'],
      ['Telur Ayam 1kg', 29000, 'kg'], ['Garam Refina 250gr', 3500, 'bungkus'], ['Kecap Manis Bango 275ml', 16000, 'botol'],
      ['Saus Sambal ABC 335ml', 14000, 'botol'], ['Royco Ayam 9gr', 1000, 'bungkus'], ['Masako Sapi 250gr', 9000, 'bungkus'],
      ['Santan Kara 65ml', 4500, 'pcs'], ['Susu Kental Manis Indomilk 370gr', 12000, 'pcs'], ['Teh Celup Sariwangi 25s', 6500, 'dus'],
      ['Kopi Kapal Api 165gr', 9500, 'bungkus'], ['Bawang Putih 250gr', 12000, 'bungkus'], ['Kacang Hijau 500gr', 15000, 'bungkus'],
      ['Mentega Blue Band 200gr', 9000, 'pcs'], ['Deterjen Rinso 770gr', 22000, 'bungkus']
    ]
  }
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const roundTo = (n, step) => Math.round(n / step) * step;

// Gabungkan semua kategori secara bergantian supaya hasilnya bercampur & seimbang
function interleavedCatalog() {
  const lists = Object.entries(CATALOG).map(([cat, v]) =>
    v.items.map(([name, sell, unit]) => ({ category: cat, name, sell, unit })));
  const out = [];
  const longest = Math.max(...lists.map(l => l.length));
  for (let i = 0; i < longest; i++) lists.forEach(l => l[i] && out.push(l[i]));
  return out;
}

function buildProducts(count, startIndex, categoryIds, unitIds) {
  const base = interleavedCatalog();
  const docs = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const item = base[idx % base.length];
    const cycle = Math.floor(idx / base.length);
    const name = cycle > 0 ? `${item.name} (${cycle + 1})` : item.name;

    const sellPrice = item.sell;
    const buyPrice = roundTo(sellPrice * (0.78 + Math.random() * 0.12), 100) || 100;

    // Variasi stok: ~5% habis, ~10% menipis, sisanya aman
    const r = Math.random();
    const stock = r < 0.05 ? 0 : r < 0.15 ? rand(1, 5) : rand(10, 150);

    docs.push({
      name,
      sku: `${SKU_PREFIX}${String(idx + 1).padStart(5, '0')}`,
      barcode: `899${String(idx + 1).padStart(9, '0')}`,
      category: categoryIds[item.category],
      description: 'Produk dummy untuk uji coba',
      buyPrice,
      sellPrice,
      stock,
      minStock: 5,
      unit: unitIds[item.unit],
      isActive: true
    });
  }
  return docs;
}

async function ensureCategories() {
  const ids = {};
  for (const [name, v] of Object.entries(CATALOG)) {
    let cat = await Category.findOne({ name });
    if (!cat) cat = await Category.create({ name, color: v.color, icon: v.icon });
    ids[name] = cat._id;
  }
  return ids;
}

async function ensureUnits() {
  const names = [...new Set(Object.values(CATALOG).flatMap(v => v.items.map(i => i[2])))];
  const ids = {};
  for (const name of names) {
    let unit = await Unit.findOne({ name });
    if (!unit) unit = await Unit.create({ name });
    ids[name] = unit._id;
  }
  return ids;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const hapus = args.includes('hapus');
  const countArg = args.find(a => /^\d+$/.test(a));
  const count = countArg ? parseInt(countArg, 10) : 100;

  if (!hapus && (count < 1 || count > 20000)) {
    console.error('Jumlah harus antara 1 dan 20000.');
    process.exit(1);
  }

  if (dry) {
    // Pratinjau tanpa database
    const fakeCat = Object.fromEntries(Object.keys(CATALOG).map(k => [k, 'CAT']));
    const fakeUnit = {};
    Object.values(CATALOG).forEach(v => v.items.forEach(i => (fakeUnit[i[2]] = 'UNIT')));
    const docs = buildProducts(count, 0, fakeCat, fakeUnit);
    console.log(`[DRY RUN] ${docs.length} produk akan dibuat. Contoh 8 pertama:`);
    docs.slice(0, 8).forEach(d => console.log(` ${d.sku}  ${d.name}  jual ${d.sellPrice}  beli ${d.buyPrice}  stok ${d.stock}`));
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI tidak ditemukan. Pastikan file .env ada di folder yang sama dengan perintah.js');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Terhubung ke MongoDB...');

  if (hapus) {
    const res = await Product.deleteMany({ sku: { $regex: `^${SKU_PREFIX}` } });
    console.log(`Selesai: ${res.deletedCount} produk dummy dihapus.`);
    return;
  }

  const [categoryIds, unitIds] = [await ensureCategories(), await ensureUnits()];
  const existing = await Product.countDocuments({ sku: { $regex: `^${SKU_PREFIX}` } });
  const docs = buildProducts(count, existing, categoryIds, unitIds);
  const inserted = await Product.insertMany(docs);

  const habis = inserted.filter(p => p.stock === 0).length;
  const menipis = inserted.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  console.log(`Selesai: ${inserted.length} produk dummy ditambahkan (${habis} stok habis, ${menipis} stok menipis).`);
  console.log(`Total produk dummy sekarang: ${existing + inserted.length}`);
  console.log('Untuk menghapusnya nanti: node perintah.js hapus');
}

main()
  .catch(err => { console.error('Gagal:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());