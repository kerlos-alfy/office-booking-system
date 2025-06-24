// src/models/Branch.js
const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    whatsapp_number: {
  type: String,
  default: null
}

}, {
    timestamps: true
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
