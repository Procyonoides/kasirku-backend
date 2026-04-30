const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const backupController = require('../controllers/backup/backup.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Folder upload temp untuk restore
const uploadDir = path.join(__dirname, '../../temp-backup');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file .zip yang diperbolehkan'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // max 100MB
});

router.use(authenticate);
router.use(authorize('owner'));

router.get('/download', backupController.backup);
router.post('/restore', upload.single('backup'), backupController.restore);

module.exports = router;