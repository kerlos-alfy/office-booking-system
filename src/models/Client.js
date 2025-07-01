const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    mobile: { type: String, required: true },

    // Company Name
    company_en: { type: String, required: true },
    company_ar: { type: String},

    // Registered Owner Name
    registered_owner_name_en: { type: String },
    registered_owner_name_ar: { type: String },

    // Nationality
    nationality_en: { type: String },
    nationality_ar: { type: String },

    // License Info
    license_number: { type: String},
    license_expiry: { type: Date },

    // New Fields
    trn: { type: String }, // الرقم الضريبي
    email: { type: String }, // الإيميل

    emirates_id_status: { type: String, enum: ['OK', 'NOT NEED', 'UNAVAILABLE'], required: true },
    contract_status: { type: String, enum: ['OK', 'NO'], required: true },
    license_status: { type: String, enum: ['OK', 'NO'], required: true },
    ejari_no: { type: Number },

    license_file_path: { type: String },
    ejari_file_path: { type: String },
    emirates_id_file_path: { type: String },
    passport_file_path: { type: String },
    contract_file_path: { type: String },
    additional_files: [String]
}, {
    timestamps: true
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
