const User = require('../../models/user/User');

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nama, username, dan password wajib diisi.' });
    }
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });

    const user = await User.create({ name, username, password, role: role || 'kasir' });
    res.status(201).json({ success: true, message: 'User berhasil dibuat.', data: user });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, username, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, username, role, isActive },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    res.json({ success: true, message: 'User berhasil diperbarui.', data: user });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    
    // Validation
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password tidak cocok.' });
    }
    
    // Security: Verify requester is owner/admin (not cashier)
    if (!['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Hanya owner/admin yang bisa reset password.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    // Prevent owner from being password reset by another admin
    if (user.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Hanya owner yang bisa reset password owner.' });
    }

    user.password = newPassword;
    await user.save();
    
    // Log audit trail
    console.log(`[AUDIT] Password reset: User ${user.username} by ${req.user.username} at ${new Date().toISOString()}`);
    
    res.json({ success: true, message: 'Password berhasil direset.' });
  } catch (err) { next(err); }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    if (user.role === 'owner') return res.status(400).json({ success: false, message: 'Owner tidak bisa dinonaktifkan.' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`, data: user });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    if (user.role === 'owner') return res.status(400).json({ success: false, message: 'Owner tidak bisa dihapus.' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err) { next(err); }
};