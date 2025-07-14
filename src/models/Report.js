const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  offices: Number,
  rent: Number,
  visits: Number,
  calls: Number,
  // باقي الحقول بتاعتك
}, { collection: 'dailyreports' }); // ✅ الحل هنا

module.exports = mongoose.model('Report', reportSchema);
