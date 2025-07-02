require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

  const payload = {
    id: user._id,
    name: user.name,
    role: user.role.name,
    permissions: user.role.permissions.map(p => p.key)
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });

  console.log('🟢 JWT Generated:', token);

  // ✅ كوكي واضحة بدون secure عشان شغال Local
  res.cookie('token', token, {
    httpOnly: false, // مؤقتًا خليه false عشان تشوفه في DevTools
    secure: false    // مهم جدًا وانت شغال Local بدون HTTPS
  });

  console.log('🍪 Cookie Set!');

  // مؤقتًا ما تعملش Redirect — خليه يطبعلك
  res.send(`✅ Token generated and cookie set! Check your DevTools -> Application -> Cookies -> localhost.`);
});

module.exports = router;
