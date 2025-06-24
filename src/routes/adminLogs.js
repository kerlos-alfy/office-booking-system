const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { isLoggedIn, hasPermission } = require('../middlewares/auth');

router.get('/admin/activity-logs', isLoggedIn, hasPermission('view_logs'), async (req, res) => {
  const logs = await ActivityLog.find().populate('user').sort({ createdAt: -1 }).limit(100);
  res.render('../views/admin/activity-log/index.ejs', { logs });
});

module.exports = router;
