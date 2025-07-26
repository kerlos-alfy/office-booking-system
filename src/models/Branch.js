const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },      // الاسم بالإنجليزي
  name_ar: { type: String, required: true },   // الاسم بالعربي
  location: { type: String, required: true },
  whatsapp_number: { type: String, default: null },

  // ✅ أضف الحقول اللي بتسحبها قدام المستخدم
  available_offices: { type: Number, default: 0 },
  total_offices: { type: Number, default: 0 },

}, {
  timestamps: true,
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
