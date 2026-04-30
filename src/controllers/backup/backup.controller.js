const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const MONGODUMP_PATH = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe"';
const MONGORESTORE_PATH = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe"';
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