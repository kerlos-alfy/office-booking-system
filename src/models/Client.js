const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    mobile: { type: String, required: true },

    // Company Name
    company_en: { type: String, required: true },
    company_ar: { type: String, required: true },

    // Registered Owner Name
    registered_owner_name_en: { type: String, required: true },
    registered_owner_name_ar: { type: String, required: true },

    // Nationality
    nationality_en: { type: String, required: true },
    nationality_ar: { type: String, required: true },

    // License Info
    license_number: { type: String, required: true },
    license_expiry: { type: Date, required: true },

    // New Fields
    trn: { type: String }, // الرقم الضريبي
    email: { type: String }, // الإيميل

    emirates_id_status: { type: String, enum: ['OK', 'NOT NEED', 'UNAVAILABLE'], required: true },
    contract_status: { type: String, enum: ['OK', 'NO'], required: true },
    license_status: { type: String, enum: ['OK', 'NO'], required: true },
    ejari_no: { type: String },

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
