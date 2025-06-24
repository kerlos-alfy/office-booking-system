const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
	amount: { type: Number, required: true },
	payment_date: { type: Date, required: true },
	payment_type: { type: String, enum: ["initial", "installment"], required: true },
});

const chequeSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  due_date: { type: Date, required: true },
  collected: { type: Boolean, default: false },
  collected_at: { type: Date, default: null },      // ✅ تاريخ التحصيل
  note: { type: String, default: "" },              // ✅ ملاحظات
});


const bookingSchema = new mongoose.Schema(
	{
		office_id: { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true },
		client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
		page_no: { type: String, required: true },
		start_date: { type: Date, required: true },
		end_date: { type: Date, required: true },
		initial_payment: { type: Number, required: true },
		total_price: { type: Number, required: true },
		vat: { type: Number, required: true },
		sec_deposit: { type: Number, required: true },
		admin_fee: { type: Number, required: true },
		commission: { type: Number, required: true },
		ejari_no: { type: String, required: true },
		status: { type: String, enum: ["active", "archived"], default: "active" },

		payments: [paymentSchema],
		cheques: [chequeSchema],
		cancel_reason: {
			type: String,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
