const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const Branch = require("../models/Branch");
const Office = require("../models/Office");
const Client = require("../models/Client");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

async function archiveExpiredBookings() {
	const now = new Date();
	const expired = await Booking.find({
		status: "active",
		end_date: { $lt: now },
	});

	for (let booking of expired) {
		await Booking.findByIdAndUpdate(booking._id, {
			status: "archived",
			cancel_reason: "انتهاء مدة العقد",
		});
		await Office.findByIdAndUpdate(booking.office_id, {
			status: "available",
			currentBooking: null,
		});
	}
}

// ✅ الصفحة الرئيسية — عرض الفروع
router.get("/", async (req, res) => {
	try {
		const branches = await Branch.find();
		res.render("bookingBranches", { branches });
	} catch (err) {
		res.status(500).send("Error loading branches");
	}
});

async function archiveExpiredBookings() {
	const now = new Date();
	const expired = await Booking.find({
		status: "active",
		end_date: { $lt: now },
	});

	for (let booking of expired) {
		await Booking.findByIdAndUpdate(booking._id, {
			status: "archived",
			cancel_reason: "انتهاء مدة العقد",
		});

		await Office.findByIdAndUpdate(booking.office_id, {
			status: "available",
			currentBooking: null,
		});
	}
}

// ✅ Offices per Branch
router.get("/branch/:branchId", async (req, res) => {
	try {
		await archiveExpiredBookings();
		const branchId = req.params.branchId;
		const offices = await Office.find({ branch_id: branchId });

		const bookings = await Booking.find({
			office_id: { $in: offices.map((o) => o._id) },
		}).populate("client_id");

		const today = new Date();
		const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

		const activeBookings = bookings.filter((b) => b.status === "active" && new Date(b.end_date) >= today);
		const bookedOfficeIds = activeBookings.map((b) => b.office_id.toString());

		res.render("bookingOffices", {
			offices,
			branchId,
			bookedOfficeIds,
			bookings: activeBookings,
			filter: req.query.filter || "all",
			totalOffices: offices.length,
			totalBooked: activeBookings.length,
			totalAvailable: offices.length - activeBookings.length,
			expiringThisMonth: activeBookings.filter((b) => new Date(b.end_date) >= today && new Date(b.end_date) <= endOfMonth).length,
		});
	} catch (err) {
		res.status(500).send("Error loading offices");
	}
});

// ✅ Form New Booking
router.get("/new/:officeId", async (req, res) => {
	try {
		const office = await Office.findById(req.params.officeId).populate("branch_id");
		const clients = await Client.find();
		res.render("bookingNew", { office, clients });
	} catch (err) {
		res.status(500).send("Error loading new booking form");
	}
});

// ✅ POST — New Booking
router.post("/", async (req, res) => {
	try {
		console.log("✅ req.body:", req.body);
		const {
			office_id,
			client_id,
			page_no,
			start_date,
			end_date,
			down_payment,
			cheques_count,
			cheques,
			total_price,
			vat,
			sec_deposit,
			admin_fee,
			commission,
			ejari,
		} = req.body;

		const chequesArray = cheques ? Object.values(cheques) : [];

		const booking = new Booking({
			office_id,
			client_id,
			page_no,
			start_date,
			end_date,
			initial_payment: down_payment,
			total_price,
			vat,
			sec_deposit,
			admin_fee,
			commission,
			ejari_no: ejari,
			payments: [
				{
					amount: down_payment,
					payment_date: new Date(),
					payment_type: "initial",
				},
			],
			cheques: chequesArray,
		});

		await booking.save();
		console.log("✅ Booking created:", booking);

		// ✅ Generate contract PDF using EJS
		const fullBooking = await Booking.findById(booking._id).populate("office_id").populate("client_id");

		const htmlTemplatePath = path.join(__dirname, "../templates/contractTemplate.ejs");
		const htmlContent = await ejs.renderFile(htmlTemplatePath, {
			tenant_name: fullBooking.client_id?.registered_owner_name || "",
			license_no: fullBooking.client_id?.license_no || "",
			email: fullBooking.client_id?.email || "",
			phone: fullBooking.client_id?.phone || "",
			license_expiry: fullBooking.client_id?.license_expiry ? fullBooking.client_id.license_expiry.toISOString().split("T")[0] : "",
			unit_number: fullBooking.office_id?.office_number || "",
			ejari: fullBooking.ejari_no || "0",
			vat: fullBooking.vat || "0",
			commission: fullBooking.commission || "0",
			office_rent: fullBooking.total_price - (fullBooking.vat || 0) - (fullBooking.commission || 0),
			total_price: fullBooking.total_price || 0,
			start_date: fullBooking.start_date.toISOString().split("T")[0],
			end_date: fullBooking.end_date.toISOString().split("T")[0],
			cheques: fullBooking.cheques || [],
		});

		const browser = await puppeteer.launch({ headless: "new" });
		const page = await browser.newPage();
		await page.setContent(htmlContent, { waitUntil: "networkidle0" });

		const pdfPath = path.join(__dirname, `../contracts/Tenancy_Contract_${booking._id}.pdf`);
		await page.pdf({
			path: pdfPath,
			format: "A4",
			printBackground: true,
			margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
		});
		await browser.close();
		console.log(`✅ PDF contract saved to: ${pdfPath}`);

		res.redirect("/bookings/success");
	} catch (err) {
		console.error("❌ Error creating booking:", err);
		res.status(500).send("Error creating booking");
	}
});
// ✅ View Booking Details
router.get("/view/:bookingId", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId).populate("office_id").populate("client_id");
		if (!booking) return res.status(404).send("Booking not found");
		res.render("bookingView", { booking });
	} catch (err) {
		res.status(500).send("Error loading booking view");
	}
});

// ✅ Archive Page → Show archived bookings
router.get("/archive", async (req, res) => {
	try {
		const clientFilter = req.query.client;

		let query = { status: "archived" };

		if (clientFilter) {
			query = {
				...query,
				client_id: {
					$in: await Client.find({
						name: { $regex: clientFilter, $options: "i" },
					}).distinct("_id"),
				},
			};
		}

		const archivedBookings = await Booking.find(query).populate("office_id").populate("client_id");

		res.render("bookingArchive", { archivedBookings, client: clientFilter });
	} catch (err) {
		res.status(500).send("Error loading archive");
	}
});

// ✅ Release Office → Archive Booking
router.post("/:bookingId/archive", async (req, res) => {
	try {
		const cancel_reason = req.body.cancel_reason || "تم الإلغاء بدون تحديد السبب";

		const booking = await Booking.findByIdAndUpdate(req.params.bookingId, {
			status: "archived",
			cancel_reason,
		});

		await Office.findByIdAndUpdate(booking.office_id, {
			status: "available",
			currentBooking: null,
		});

		res.redirect("/bookings/view/" + req.params.bookingId);
	} catch (err) {
		res.status(500).send("Error archiving booking");
	}
});

// ✅ Toggle Collected Status for Cheque
router.post("/:bookingId/cheques/:chequeIndex/toggle-collected", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId);
		const chequeIndex = parseInt(req.params.chequeIndex);

		if (!booking || !booking.cheques[chequeIndex]) {
			return res.status(404).send("Cheque not found");
		}

		// Toggle collected
		booking.cheques[chequeIndex].collected = !booking.cheques[chequeIndex].collected;

		await booking.save();

		res.redirect(`/bookings/view/${booking._id}`);
	} catch (err) {
		res.status(500).send("Error toggling cheque collected");
	}
});
// ✅ Success Page
router.get("/success", (req, res) => {
	res.render("bookingSuccess");
});

// ✅ Generate PDF contract manually
router.get("/:bookingId/generate-contract", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId)
			.populate("office_id")
			.populate({ path: "office_id", populate: { path: "branch_id" } })
			.populate("client_id");

		if (!booking) return res.status(404).send("Booking not found");

		const templatePath = path.join(__dirname, "../templates/contractTemplate.ejs");

		const html = await ejs.renderFile(templatePath, {
			tenant_name: booking.client_id?.registered_owner_name || "",
			license_no: booking.client_id?.license_no || "",
			email: booking.client_id?.email || "",
			phone: booking.client_id?.phone || "",
			license_expiry: booking.client_id?.license_expiry ? new Date(booking.client_id.license_expiry).toISOString().split("T")[0] : "",
			unit_number: booking.office_id?.office_number || "",
			ejari: booking.ejari_no || "0",
			vat: booking.vat || "0",
			commission: booking.commission || "0",
			office_rent: booking.total_price - (booking.vat || 0) - (booking.commission || 0),
			total_price: booking.total_price || 0,
			start_date: booking.start_date ? new Date(booking.start_date).toISOString().split("T")[0] : "",
			end_date: booking.end_date ? new Date(booking.end_date).toISOString().split("T")[0] : "",
			cheques: (booking.cheques || []).map((chq) => ({
				date: chq.date ? new Date(chq.date).toISOString().split("T")[0] : "",
				amount: chq.amount || 0,
			})),
		});

		const browser = await puppeteer.launch({
			headless: "new",
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		const page = await browser.newPage();

		await page.setContent(html, { waitUntil: "networkidle0" });
		const pdfBuffer = await page.pdf({
			format: "A4",
			printBackground: true,
			margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
		});

		await browser.close();

		const filename = `Tenancy_Contract_${booking._id}.pdf`;
		res.set({
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
		});

		res.send(pdfBuffer);
	} catch (err) {
		console.error("❌ Error generating contract:", err);
		res.status(500).send("Error generating contract");
	}
});

// ✅ View Archived Booking Details
router.get("/archive/:bookingId", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId)
			.populate("office_id")
			.populate({
				path: "office_id",
				populate: { path: "branch_id" },
			})
			.populate("client_id");

		if (!booking || booking.status !== "archived") {
			return res.status(404).send("Archived booking not found");
		}

		res.render("bookingArchivedView", { booking });
	} catch (err) {
		console.error("❌ Error loading archived booking details:", err);
		res.status(500).send("Error loading archived booking details");
	}
});

module.exports = router;
