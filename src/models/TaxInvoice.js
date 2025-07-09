// models/TaxInvoice.js

const mongoose = require('mongoose');

// ✅ تعريف السكيمة
const taxInvoiceSchema = new mongoose.Schema({
  booking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  invoice_number: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  }, // هنا بتخزن بيانات الفاتورة كاملة كـ JSON
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// ✅ عمل index على رقم الفاتورة لتسريع البحث
taxInvoiceSchema.index({ invoice_number: 1 });

// ✅ Middleware لتحديث حقل updated_at تلقائيًا عند كل حفظ
taxInvoiceSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// ✅ تصدير الموديل
module.exports = mongoose.model('TaxInvoice', taxInvoiceSchema);
