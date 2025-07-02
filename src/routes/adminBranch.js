const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// ✅ Dashboard مدير الفرع
router.get('/admin/branch-dashboard',
  authenticateJWT,
  hasPermission('branch_manager'),
  async (req, res) => {
    try {
      const branchId = req.user.branch;

      if (!branchId) {
        return res.status(403).send('❌ No branch assigned for this user.');
      }

      const branch = await Branch.findById(branchId);
      if (!branch) {
        return res.status(404).send('❌ Branch not found.');
      }

      res.render('admin/branch-dashboard', { branch, user: req.user });
    } catch (err) {
      console.error(err);
      res.status(500).send('❌ Something went wrong.');
    }
  }
);

module.exports = router;
