// const mongoose = require('mongoose');

// const activityLogSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   action: {
//     type: String,
//     required: true
//   },
//   ip: String,
//   userAgent: String,
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('ActivityLog', activityLogSchema);

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const logActivity = require('../utils/logActivity');

// صفحة تسجيل الدخول
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// معالجة تسجيل الدخول
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate({
      path: 'role',
      populate: { path: 'permissions', model: 'Permission' }
    });

    if (!user) {
      return res.render('auth/login', { error: '⚠️ Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('auth/login', { error: '⚠️ Invalid credentials' });
    }

    // حفظ بيانات الجلسة
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map(p => p.key),
    };

    // سجل الدخول في Activity Logs
    await logActivity(user._id, 'login', 'User logged in');

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: '❌ Something went wrong' });
  }
});

// تسجيل الخروج
router.get('/logout', async (req, res) => {
  if (req.session.user) {
    await logActivity(req.session.user._id, 'logout', 'User logged out');
  }
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
