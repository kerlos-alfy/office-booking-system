// routes/adminRoles.js
const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// عرض كل الأدوار
router.get('/roles',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const roles = await Role.find().populate('permissions');
    res.render('admin/roles/index', { roles });
  }
);

// عرض فورم إنشاء دور جديد
router.get('/roles/new',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const permissions = await Permission.find();
    const roles = await Role.find().populate('permissions'); // ✅ لازم تجيبها
    res.render('admin/roles/new', { permissions, roles });
  }
);

// حفظ الدور الجديد
router.post('/roles',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const { name, permissions } = req.body;
    await Role.create({ name, permissions });
    res.redirect('/admin/roles');
  }
);

// عرض فورم التعديل
router.get('/roles/:id/edit',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const role = await Role.findById(req.params.id);
    const permissions = await Permission.find();
    res.render('admin/roles/edit', { role, permissions });
  }
);

// حفظ التعديلات
router.post('/roles/:id',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const { name, permissions } = req.body;
    const selectedPermissions = Array.isArray(permissions) ? permissions : [permissions];
    await Role.findByIdAndUpdate(req.params.id, {
      name,
      permissions: selectedPermissions,
    });
    res.redirect('/admin/roles');
  }
);

// حذف الدور
router.delete('/roles/:id',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const role = await Role.findById(req.params.id);

    if (!role) return res.redirect('/admin/roles');

    // ممنوع حذف الـ super_admin
    if (role.key === 'super_admin') {
      return res.redirect('/admin/roles');
    }

    await Role.findByIdAndDelete(req.params.id);
    res.redirect('/admin/roles');
  }
);

module.exports = router;
