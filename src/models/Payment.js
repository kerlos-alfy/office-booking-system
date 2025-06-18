const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema(
	{
		booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
		client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
		amount: { type: Number, required: true },
		payment_date: { type: Date },
		due_date: { type: Date, required: true },
		payment_type: { type: String, enum: ["initial", "installment"], required: true },
		status: { type: String, enum: ["PAID", "UNPAID"], default: "UNPAID" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
