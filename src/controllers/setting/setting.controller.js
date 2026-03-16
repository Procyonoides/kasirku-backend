const Setting = require('../../models/setting/Setting');

exports.get = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    res.json({ success: true, data: setting });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create(req.body);
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, req.body, { new: true });
    }
    res.json({ success: true, data: setting });
  } catch (err) { next(err); }
};