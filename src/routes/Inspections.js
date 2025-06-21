// routes/inspections.js
const express = require("express");
const router = express.Router();
const Inspection = require("../models/Inspection");

// ✅ إضافة تفتيش إضافي
router.post("/inspections/add", async (req, res) => {
	try {
		const { booking_id, type, date, paid, notes } = req.body;

		await Inspection.create({
			booking_id,
			type: type || "custom",
			status: "pending",
			date: date ? new Date(date) : null,
			paid: paid === "true",
			notes,
		});

		res.redirect("/bookings/view/" + booking_id);
	} catch (err) {
		console.error("❌ Error adding inspection:", err);
		res.status(500).send("Failed to add inspection");
	}
});

// ✅ تحديث التفتيش (status/date/notes)
router.post("/inspections/:id/update", async (req, res) => {
	try {
		const insId = req.params.id;
		const { status, date, notes } = req.body;

		await Inspection.findByIdAndUpdate(insId, {
			status,
			date: date ? new Date(date) : undefined,
			notes,
		});

		const inspection = await Inspection.findById(insId);
		res.redirect("/bookings/view/" + inspection.booking_id);
	} catch (err) {
		console.error("❌ Error updating inspection:", err);
		res.status(500).send("Failed to update inspection");
	}
});

module.exports = router;
