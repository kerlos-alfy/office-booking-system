require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Permission = require('../models/Permission'); // ✅ لازم تستدعي Permission

// صفحة تسجيل الدخول
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// معالجة تسجيل الدخول
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('👉 Start /login route');
  console.log('📧 Email:', email);

  const user = await User.findOne({ email }).populate({
    path: 'role',
    populate: { path: 'permissions' }
  });

  if (!user) {
    console.log('❌ User not found');
    return res.render('auth/login', { error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    console.log('❌ Password mismatch');
    return res.render('auth/login', { error: 'Invalid credentials' });
  }

  console.log('✅ User authenticated');

  // ✅ هنا الشرط المهم عشان السوبر أدمن ياخد كل الصلاحيات
  const payload = {
    id: user._id,
    name: user.name,
    role: user.role.name,
    permissions: []
  };

  if (user.role.name === 'super_admin') {
    // هات كل الصلاحيات من الـ DB
    const allPermissions = await Permission.find();
    payload.permissions = allPermissions.map(p => p.key);
  } else {
    payload.permissions = user.role.permissions.map(p => p.key);
  }

  if (user.branch) {
    payload.branch = user.branch; // لو عندك فرع مربوط
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });

  console.log('🟢 JWT Generated:', token);

  res.cookie('token', token, {
    httpOnly: true,
    secure: false // Local
  });

  console.log('🍪 JWT Cookie Set!');

  res.redirect('/admin/dashboard');
});

// تسجيل الخروج
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
