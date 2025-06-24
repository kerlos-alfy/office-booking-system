const ActivityLog = require('../models/ActivityLog');

async function logActivity(user, action, req) {
  try {
    await ActivityLog.create({
      user: user._id,
      action,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('❌ Error logging activity:', error.message);
  }
}

module.exports = logActivity;
