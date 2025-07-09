// ✅ routes/invoices.js
const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

// ✅ عرض كل الفواتير
router.get('/', async (req, res) => {
  const invoices = await Invoice.find().sort({ createdAt: -1 });
  res.render('invoices/index', { invoices });
});

// ✅ إنشاء فاتورة جديدة (نموذج)
router.get('/new', (req, res) => {
  res.render('invoices/new');
});

// ✅ حفظ الفاتورة
router.post('/', async (req, res) => {
  const { clientName, items } = req.body;
  const invoice = new Invoice({
    clientName,
    items,
    total: calculateTotal(items),
  });
  await invoice.save();
  res.redirect(`/invoices/${invoice._id}`);
});

// ✅ عرض فاتورة معينة
router.get('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  res.render('invoices/show', { invoice });
});

// ✅ تحميل PDF (اختياري - هنعمله Puppeteer)
router.get('/:id/pdf', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  // هنا توليد PDF مثلا باستخدام Puppeteer
  res.send('PDF download will be here');
});

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

module.exports = router;
