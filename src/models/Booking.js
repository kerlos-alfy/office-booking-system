const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    office_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    contract_type: { type: String, enum: ['monthly', 'yearly'], required: true },
    initial_payment: { type: Number, required: true },
    total_price: { type: Number, required: true },
    payments: [
        {
            amount: Number,
            payment_date: Date,
            payment_type: { type: String, enum: ['initial', 'installment'], default: 'installment' }
        }
    ]
}, {
    timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
