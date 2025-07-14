const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Branch = require('../models/Branch'); // ✅ مهم عشان تستخدم Branch.find()

const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// ======================== Dashboard ========================
router.get('/dashboard',
  authenticateJWT,
  hasPermission('manage_roles'),
  (req, res) => {
    res.render('admin/dashboard', { user: req.user });
  }
);

// ======================== Users ========================
// عرض كل المستخدمين
router.get('/users',
  authenticateJWT,
  hasPermission('add_admins'),
  async (req, res) => {
    const users = await User.find().populate({
      path: 'role',
      populate: { path: 'permissions' }
    });
    res.render('admin/users/index', { user: req.user,users });
  }
);

// فورم مستخدم جديد
router.get('/users/new',
  authenticateJWT,
  hasPermission('add_admins'),
  async (req, res) => {
    const roles = await Role.find();
    const branches = await Branch.find();
    res.render('admin/users/new', { user: req.user,roles, branches }); // ابعت الاتنين!
  }
);


// حفظ مستخدم جديد
router.post('/users',
  authenticateJWT,
  hasPermission('add_admins'),
  async (req, res) => {
    try {
      const { name, email, password, role, branch } = req.body;

      const hashed = await bcrypt.hash(password, 12);

      await User.create({
        name,
        email,
        password: hashed,
        role,
        branch: branch || null // ✅ مهم
      });

      res.redirect('/admin/users');
    } catch (err) {
      console.error(err);
      res.render('admin/users/new', { user: req.user,
        error: 'حدث خطأ أثناء حفظ المستخدم',
        roles: await Role.find(),
        branches: await Branch.find() // ✅ مهم جداً عشان الـ Dropdown
      });
    }
  }
);

// فورم تعديل مستخدم
router.get('/users/:id/edit',
  authenticateJWT,
  hasPermission('add_admins'),
  async (req, res) => {
    const user = await User.findById(req.params.id);
    const roles = await Role.find();
    const branches = await Branch.find(); // ✅ مهم للفروع

    if (!user) return res.redirect('/admin/users');

    res.render('admin/users/edit', { user: req.user, editUser: user, roles, branches });
  }
);

// تعديل المستخدم
router.put('/users/:id',
  authenticateJWT,
  hasPermission('add_admins'),
  async (req, res) => {
    try {
      const { name, email, password, role, branch } = req.body;

      const updateData = { name, email, role, branch: branch || null }; // ✅ مهم

      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 12);
      }

      await User.findByIdAndUpdate(req.params.id, updateData);

      res.redirect('/admin/users');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/users');
    }
  }
);


// حذف المستخدم
// router.delete('/users/:id',
//   authenticateJWT,
//   hasPermission('add_admins'),
//   async (req, res) => {
//     await User.findByIdAndDelete(req.params.id);
//     res.redirect('/admin/users');
//   }
// );

router.delete('/users/:id',
  authenticateJWT,
  hasPermission('add_admins'),
  async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ======================== Roles ========================
// عرض كل الأدوار
// router.get('/roles',
//   authenticateJWT,
//   hasPermission('manage_roles'),
//   async (req, res) => {
//     const roles = await Role.find().populate('permissions');
//     res.render('admin/roles/index', { roles });
//   }
// );

// فورم دور جديد
// router.get('/roles/new',
//   authenticateJWT,
//   hasPermission('manage_roles'),
//   async (req, res) => {
//     const permissions = await Permission.find();
//     const roles = await Role.find().populate('permissions');
//     res.render('admin/roles/new', { permissions, roles });
//   }
// );

// حفظ دور جديد
// router.post('/roles',
//   authenticateJWT,
//   hasPermission('manage_roles'),
//   async (req, res) => {
//     try {
//       const { name, permissions } = req.body;
//       const selectedPermissions = Array.isArray(permissions) ? permissions : [];
//       await Role.create({ name, permissions: selectedPermissions });
//       res.redirect('/admin/roles/new');
//     } catch (err) {
//       console.error(err);
//       const permissions = await Permission.find();
//       const roles = await Role.find().populate('permissions');
//       res.render('admin/roles/new', {
//         error: 'حدث خطأ أثناء حفظ الدور',
//         permissions,
//         roles
//       });
//     }
//   }
// );

// فورم تعديل دور
// router.get('/roles/:id/edit',
//   authenticateJWT,
//   hasPermission('manage_roles'),
//   async (req, res) => {
//     try {
//       const role = await Role.findById(req.params.id).populate('permissions');
//       const permissions = await Permission.find();
//       if (!role) return res.redirect('/admin/roles');
//       res.render('admin/roles/edit', { role, permissions });
//     } catch (err) {
//       console.error(err);
//       res.redirect('/admin/roles');
//     }
//   }
// );

// تعديل الدور
router.put('/roles/:id',
  authenticateJWT,
  hasPermission('manage_roles'),
  async (req, res) => {
    const { name, permissions } = req.body;
    try {
      await Role.findByIdAndUpdate(req.params.id, { name, permissions });
      res.redirect('/admin/roles');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/roles');
    }
  }
);

// حذف الدور
// router.delete('/roles/:id',
//   authenticateJWT,
//   hasPermission('manage_roles'),
//   async (req, res) => {
//     try {
//       const roleId = req.params.id;
//       const usersWithRole = await User.find({ role: roleId });
//       if (usersWithRole.length > 0) {
//         return res.render('admin/roles/index', {
//           error: 'لا يمكن حذف هذا الدور لأنه مرتبط بمستخدمين.',
//           roles: await Role.find().populate('permissions'),
//           permissions: await Permission.find()
//         });
//       }
//       await Role.findByIdAndDelete(roleId);
//       res.redirect('/admin/roles');
//     } catch (err) {
//       console.error(err);
//       res.redirect('/admin/roles');
//     }
//   }
// );

module.exports = router;
