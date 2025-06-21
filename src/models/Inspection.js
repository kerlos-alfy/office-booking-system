// models/Inspection.js
const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema(
	{
		booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
		type: {
			type: String,
			enum: ["labor", "bank", "custom"], // ✅ بالإنجليزي
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "done"],
			default: "pending",
		},
		date: Date,
		notes: String,
		paid: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Inspection", inspectionSchema);
