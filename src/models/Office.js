const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema({
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    office_number: { type: String, required: true },
    monthly_price: { type: Number, required: true },
    yearly_price: { type: Number, required: true }
}, {
    timestamps: true
});

const Office = mongoose.model('Office', officeSchema);

module.exports = Office;
