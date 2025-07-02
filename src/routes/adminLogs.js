const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// عرض كل اللوجات
router.get('/admin/logs',
  authenticateJWT,
  hasPermission('view_logs'),
  async (req, res) => {
    const logs = await ActivityLog.find().populate('user').sort({ createdAt: -1 });
    res.render('admin/logs/index', { logs });
  }
);

module.exports = router;
