const express = require('express');
const router = express.Router();
const Permission = require('../models/Permission');

const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// ✅ عرض كل الصلاحيات
router.get('/permissions',
  authenticateJWT,

  hasPermission('manage_permissions'),
  
  async (req, res) => {
    const permissions = await Permission.find();
    
    res.render('admin/permissions/index', {user: req.user, permissions });
  }
);

// ✅ عرض فورم صلاحية جديدة
router.get('/permissions/new',
  authenticateJWT,
  hasPermission('manage_permissions'),
  async (req, res) => {
    res.render('admin/permissions/new', {user: req.user,});
  }
);

// ✅ حفظ صلاحية جديدة
router.post('/permissions',
  authenticateJWT,
  hasPermission('manage_permissions'),
  async (req, res) => {
    const { name, key } = req.body;
    await Permission.create({ name, key });
    res.redirect('/admin/permissions');
  }
);

// ✅ حذف صلاحية
router.delete('/permissions/:id',
  authenticateJWT,
  hasPermission('manage_permissions'),
  async (req, res) => {
    await Permission.findByIdAndDelete(req.params.id);
    res.redirect('/admin/permissions');
  }
);

module.exports = router;
