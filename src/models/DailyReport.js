const mongoose = require('mongoose');

const DailyReportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ✅ ربط بأكثر من مكتب لو التقرير يشمل أكتر من مكتب
  office_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Office' }],
  rent_office_no: [String], // تخزن أرقام المكاتب بشكل نصي لكل مكتب
rent_company_name: [String], // مهم جداً يكون موجود

  // ✅ تحصيل اليومي
  rent_amount: [Number],
  rent_due_date: [Date],
  rent_date_paid: [Date],
  rent_money_destination: [String],

  // ✅ الزيارات
  visits_details: [String],

  // ✅ الدفعات
  payment_ejari: [Number],
  payment_dp: [Number],
  payment_booking: [Number],
  payment_etc: [String],

  // ✅ التفتيشات

  inspection_office_no: [String],   // 🆕 New

  inspection_companies: [String],
  inspection_type: [String],
  inspection_order: [String],
  inspection_ejari_unit: [String],

  // ✅ العدادات
  inspection_count: Number,
  visits_count: Number,
  available_offices: Number,

  // ✅ الرسائل
  messages_whatsapp: Number,
  messages_dubizzle: Number,
  messages_bayut: Number,
  messages_property_finder: Number,

  // ✅ الوقت
  arriving_time: String,
  leaving_time: String,
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

   branch_name: { type: String },

  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailyReport', DailyReportSchema);
