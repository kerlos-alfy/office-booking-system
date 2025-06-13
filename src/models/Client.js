const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    mobile: { type: String, required: true },
    company: { type: String, required: true },
    registered_owner_name: { type: String, required: true },
    nationality: { type: String, required: true },
    emirates_id_status: { type: String, enum: ['OK', 'NOT NEED', 'UNAVAILABLE'], required: true },
    contract_status: { type: String, enum: ['OK', 'NO'], required: true },
    license_status: { type: String, enum: ['OK', 'NO'], required: true },
    ejari_no: { type: String },

    // New — Files (optional paths):
    license_file_path: { type: String },
    ejari_file_path: { type: String },
    emirates_id_file_path: { type: String },
    passport_file_path: { type: String },

    contract_file_path: { type: String },
    additional_files: [String] // array of filenames
}, {
    timestamps: true
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
