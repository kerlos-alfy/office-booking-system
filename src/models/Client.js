const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String }
}, {
    timestamps: true
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
