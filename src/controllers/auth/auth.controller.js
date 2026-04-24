const jwt = require('jsonwebtoken');
const User = require('../../models/user/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
const generateRefresh = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });

    const user = await User.findOne({ username }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Akun tidak aktif.' });

    const token = generateToken(user._id);
    const refreshToken = generateRefresh(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Login berhasil.', data: { token, refreshToken, user } });
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nama, username, dan password wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }
    const existingOwner = await User.findOne({ role: 'owner' });
    const assignedRole = existingOwner ? (role || 'kasir') : 'owner';

    const user = await User.create({ name, username, password, role: assignedRole });
    const token = generateToken(user._id);

    res.status(201).json({ success: true, message: 'Akun berhasil dibuat.', data: { token, user } });
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token diperlukan.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token tidak valid.' });
    }

    const token = generateToken(user._id);
    res.json({ success: true, data: { token } });
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logout berhasil.' });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Password lama tidak sesuai.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, username } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, username },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Profil berhasil diperbarui.', data: user });
  } catch (err) { next(err); }
};