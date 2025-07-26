const mongoose = require('mongoose');

// ✅ Nested schema for follow-up logs
const FollowUpLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  note: {
    type: String,
    required: true
  }
});

const CallReportSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  call_date: {
    type: Date,
    required: true
  },

  phone_number: {
    type: String,
    required: true
  },

  // ✅ الحقل الجديد لاسم العميل
  client_name: {
    type: String,
    required: false,
    trim: true
  },

  source: {
    type: String,
    enum: ['dubizzle', 'bayut', 'meta', 'PropertyFinder'],
    required: true
  },

  action: {
    type: String,
    required: true
  },

  answered: {
    type: Boolean,
    default: false
  },

  followed_up: {
    type: Boolean,
    default: false
  },

  // ✅ لو فاتت فترة المتابعة القصوى
  overdue: {
    type: Boolean,
    default: false
  },

  marked_done: {
    type: Boolean,
    default: false
  },

  // ✅ تاريخ آخر متابعة
  last_follow_up: {
    type: Date,
    default: null
  },

  // ✅ سجل المتابعات
  follow_up_logs: [FollowUpLogSchema]

}, {
  timestamps: true
});

module.exports = mongoose.model('CallReport', CallReportSchema);
