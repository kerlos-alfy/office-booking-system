// models/Client.js
const mongoose = require('mongoose');

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// const TRN_REGEX = /^\d{15}$/; // اختياري للتشدّد

// يسمح بأرقام وشرطات و/ في رقم الإيجاري
const EJARI_REGEX = /^[0-9\-\/]+$/;

const clientSchema = new mongoose.Schema(
  {
    // 📱 Mobile
    mobile: { type: String, required: true, trim: true },

    // 🏢 Company Name
    company_en: { type: String, required: true, trim: true },
    company_ar: { type: String, trim: true },

    // 👤 Registered Owner Name
    registered_owner_name_en: { type: String, trim: true },
    registered_owner_name_ar: { type: String, trim: true },

    // 🌍 Nationality
    nationality_en: { type: String, trim: true },
    nationality_ar: { type: String, trim: true },

    // 🪪 License Info
    license_number: { type: String, trim: true },
    license_expiry: { type: Date },

    // 🧾 New Fields
    trn: {
      type: String,
      trim: true,
      // match: TRN_REGEX,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || EMAIL_REGEX.test(v),
        message: 'Invalid email format',
      },
    },

    // ✅ Status Fields (مع قيم افتراضية)
    emirates_id_status: {
      type: String,
      enum: ['OK', 'NOT NEED', 'UNAVAILABLE'],
      required: true,
      trim: true,
      default: 'UNAVAILABLE', // ✅ default
    },
    contract_status: {
      type: String,
      enum: ['OK', 'NO'],
      required: true,
      trim: true,
      default: 'NO', // ✅ default
    },
    license_status: {
      type: String,
      enum: ['OK', 'NO'],
      required: true,
      trim: true,
      default: 'NO', // ✅ default
    },

    // 🧾 Ejari
    ejari_no: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || EJARI_REGEX.test(v),
        message: 'Ejari format must contain digits, "-" or "/" only',
      },
    },

    // 📎 Files
    license_file_path: { type: String, trim: true },
    ejari_file_path: { type: String, trim: true },
    emirates_id_file_path: { type: String, trim: true },
    passport_file_path: { type: String, trim: true },
    contract_file_path: { type: String, trim: true },
    additional_files: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 🧼 تطبيع قبل الحفظ: حوّل الـ "" إلى undefined عشان مايتسجّلوش كنص فاضي
clientSchema.pre('save', function (next) {
  const doc = this;
  [
    'mobile',
    'company_en',
    'company_ar',
    'registered_owner_name_en',
    'registered_owner_name_ar',
    'nationality_en',
    'nationality_ar',
    'license_number',
    'trn',
    'email',
    'ejari_no',
    'license_file_path',
    'ejari_file_path',
    'emirates_id_file_path',
    'passport_file_path',
    'contract_file_path',
  ].forEach((k) => {
    if (doc[k] !== undefined && typeof doc[k] === 'string') {
      doc[k] = doc[k].trim();
      if (doc[k] === '') doc[k] = undefined;
    }
  });
  next();
});

// مؤشرات تساعد في البحث
clientSchema.index({ mobile: 1 });
clientSchema.index({ company_en: 1 });

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;
