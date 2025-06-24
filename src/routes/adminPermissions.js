// src/routes/adminPermissions.js
const express = require('express');
const router = express.Router();
const Permission = require('../models/Permission');
const { isLoggedIn, hasPermission } = require('../middlewares/auth');

router.get('/admin/permissions', isLoggedIn, hasPermission('manage_roles'), async (req, res) => {
	try {
		const permissions = await Permission.find();
		res.render('admin/permissions/index', { permissions });
	} catch (err) {
		console.error(err);
		res.status(500).send('Server Error');
	}
});


// عرض صفحة إنشاء صلاحية جديدة
router.get('/admin/permissions/new', isLoggedIn, hasPermission('manage_roles'), (req, res) => {
  res.render('admin/permissions/new');
});

// حفظ الصلاحية
router.post('/admin/permissions', isLoggedIn, hasPermission('manage_roles'), async (req, res) => {
  const { key, name } = req.body;
  await Permission.create({ key, name });
  res.redirect('/admin/permissions');
});


// ✅ صفحة تعديل صلاحية
router.get('/admin/permissions/:id/edit', async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  if (!permission) return res.status(404).send('Permission not found');
  res.render('admin/permissions/edit', { permission });
});

// ✅ تحديث صلاحية
router.put('/admin/permissions/:id', async (req, res) => {
  const { key, name } = req.body;
  await Permission.findByIdAndUpdate(req.params.id, { key, name });
  res.redirect('/admin/permissions');
});

// ✅ حذف صلاحية
router.delete('/admin/permissions/:id', async (req, res) => {
  await Permission.findByIdAndDelete(req.params.id);
  res.redirect('/admin/permissions');
});
module.exports = router;
