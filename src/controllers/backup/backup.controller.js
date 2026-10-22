const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const Setting = require('../../models/setting/Setting');

// Cari lokasi mongodump / mongorestore, urutannya:
//  1) path dari file .env (MONGODUMP_PATH / MONGORESTORE_PATH)
//  2) folder umum MongoDB di Windows (versi apa pun)
//  3) kalau tidak ketemu, pakai nama perintah biasa (harus ada di PATH Windows)
const findMongoTool = (exeName, envPath) => {
  const candidates = [];
  if (envPath) candidates.push(envPath);
  ['C:\\Program Files\\MongoDB\\Tools', 'C:\\Program Files\\MongoDB\\Server'].forEach(root => {
    if (!fs.existsSync(root)) return;
    fs.readdirSync(root).sort().reverse().forEach(ver => candidates.push(path.join(root, ver, 'bin', exeName)));
  });
  const found = candidates.find(p => fs.existsSync(p));
  console.log(`[backup] ${exeName}: ${found || 'tidak ditemukan di folder umum, pakai PATH'}`);
  return found ? `"${found}"` : exeName.replace('.exe', '');
};

const MONGODUMP_PATH = findMongoTool('mongodump.exe', process.env.MONGODUMP_PATH);
const MONGORESTORE_PATH = findMongoTool('mongorestore.exe', process.env.MONGORESTORE_PATH);
const BACKUP_TEMP_DIR = 'C:\\kasirku-temp-backup';

// Pastikan folder temp ada
if (!fs.existsSync(BACKUP_TEMP_DIR)) {
  fs.mkdirSync(BACKUP_TEMP_DIR, { recursive: true });
}

exports.backup = async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(BACKUP_TEMP_DIR, `backup-${timestamp}`);
    const zipFile = path.join(BACKUP_TEMP_DIR, `kasirku-backup-${timestamp}.zip`);

    // Ambil nama db dari MONGODB_URI
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];

    // Jalankan mongodump
    const dumpCmd = `${MONGODUMP_PATH} --db ${dbName} --out "${backupFolder}"`;

    exec(dumpCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('mongodump error:', error);
        return res.status(500).json({ success: false, message: 'Backup gagal: ' + error.message });
      }

      // Zip hasil backup
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        // Kirim file ke browser
        res.download(zipFile, `kasirku-backup-${timestamp}.zip`, (err) => {
          // Hapus file temp setelah download
          fs.rmSync(backupFolder, { recursive: true, force: true });
          fs.unlinkSync(zipFile);
          if (err) console.error('Download error:', err);
        });
      });

      archive.on('error', (err) => {
        return res.status(500).json({ success: false, message: 'Zip gagal: ' + err.message });
      });

      archive.pipe(output);
      archive.directory(backupFolder, false);
      archive.finalize();
    });

  } catch (err) { next(err); }
};

const DEFAULT_BACKUP_DIR = 'C:\\KasirKu-Backup';
// Folder tujuan backup: dari Pengaturan, atau folder bawaan kalau belum diisi
const getBackupDir = async () => {
  const setting = await Setting.findOne();
  return (setting && setting.backupDir) || DEFAULT_BACKUP_DIR;
};

// Buat dump database lalu zip langsung ke zipFile. Folder dump sementara dihapus setelahnya.
const createBackupZip = (zipFile) => new Promise((resolve, reject) => {
  const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];
  const dumpFolder = path.join(BACKUP_TEMP_DIR, `dump-${Date.now()}`);

  exec(`${MONGODUMP_PATH} --db ${dbName} --out "${dumpFolder}"`, (error) => {
    if (error) return reject(new Error('mongodump gagal: ' + error.message));

    const output = fs.createWriteStream(zipFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      fs.rmSync(dumpFolder, { recursive: true, force: true });
      resolve();
    });
    archive.on('error', (err) => {
      fs.rmSync(dumpFolder, { recursive: true, force: true });
      reject(err);
    });

    archive.pipe(output);
    archive.directory(dumpFolder, false);
    archive.finalize();
  });
});

// Backup yang disimpan langsung ke folder pilihan pemilik (Pengaturan -> backupDir) di komputer server
exports.save = async (req, res, next) => {
  try {
    const dir = await getBackupDir();

    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK); // error kalau folder tidak bisa ditulis

    // Nama file memakai waktu Asia/Jakarta supaya gampang dibaca: kasirku-backup-2026-10-09_14-30-05.zip
    const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
      .replace(' ', '_').replace(/:/g, '-');
    const fileName = `kasirku-backup-${stamp}.zip`;
    const zipFile = path.join(dir, fileName);

    await createBackupZip(zipFile);
    const { size } = fs.statSync(zipFile);

    res.json({ success: true, message: 'Backup tersimpan.', data: { folder: dir, fileName, path: zipFile, size } });
  } catch (err) {
    console.error('backup save error:', err);
    res.status(500).json({ success: false, message: 'Backup gagal: ' + err.message });
  }
};

// Daftar file backup di folder tujuan (terbaru di atas), supaya pemilik bisa melihat apa yang sudah tersimpan
exports.list = async (req, res, next) => {
  try {
    const dir = await getBackupDir();
    const exists = fs.existsSync(dir);

    let files = [];
    if (exists) {
      files = fs.readdirSync(dir)
        .filter(name => name.startsWith('kasirku-backup-') && name.toLowerCase().endsWith('.zip'))
        .map(name => {
          const stat = fs.statSync(path.join(dir, name));
          return { fileName: name, size: stat.size, modifiedAt: stat.mtime };
        })
        .sort((a, b) => b.modifiedAt - a.modifiedAt)
        .slice(0, 50);
    }

    res.json({ success: true, data: { folder: dir, exists, files } });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File backup wajib diupload.' });
    }

    const zipFile = req.file.path;
    const extractFolder = path.join(BACKUP_TEMP_DIR, `restore-${Date.now()}`);
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];

    // Extract zip
    const unzipper = require('unzipper');
    fs.createReadStream(zipFile)
      .pipe(unzipper.Extract({ path: extractFolder }))
      .on('close', () => {
        // Cari folder db di dalam extracted
        const dbFolder = path.join(extractFolder, dbName);

        if (!fs.existsSync(dbFolder)) {
          fs.rmSync(extractFolder, { recursive: true, force: true });
          fs.unlinkSync(zipFile);
          return res.status(400).json({ success: false, message: 'File backup tidak valid.' });
        }

        // Jalankan mongorestore
        const restoreCmd = `${MONGORESTORE_PATH} --db ${dbName} --drop "${dbFolder}"`;

        exec(restoreCmd, (error, stdout, stderr) => {
          // Hapus file temp
          fs.rmSync(extractFolder, { recursive: true, force: true });
          fs.unlinkSync(zipFile);

          if (error) {
            console.error('mongorestore error:', error);
            return res.status(500).json({ success: false, message: 'Restore gagal: ' + error.message });
          }

          res.json({ success: true, message: 'Database berhasil direstore.' });
        });
      })
      .on('error', (err) => {
        res.status(500).json({ success: false, message: 'Extract gagal: ' + err.message });
      });

  } catch (err) { next(err); }
};