const express = require('express');
const router = express.Router();

// ✅ الصفحة الرئيسية أو أي صفحة عامة
router.get('/', (req, res) => {
  res.render('index'); // غير 'home' لو عندك صفحة مختلفة
});

// ✅ صفحة غير مسموح بالدخول
router.get('/unauthorized', (req, res) => {
  
  res.render('unauthorized');
});

module.exports = router;
