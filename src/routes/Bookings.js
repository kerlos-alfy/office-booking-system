const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const Branch = require("../models/Branch");
const Office = require("../models/Office");
const Client = require("../models/Client");
const Inspection = require("../models/Inspection");
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

router.get("/", async (req, res) => {
	try {
		const branches = await Branch.find();
		res.render("bookingBranches", { branches });
	} catch (err) {
		res.status(500).send("Error loading branches");
	}
});
router.get("/branch/:branchId", async (req, res) => {
	try {
		await archiveExpiredBookings();

		const branchId = req.params.branchId;
		const { filter = "all", size_category } = req.query;
		const today = new Date();
		const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

		// 1️⃣ فلترة المكاتب
		let officeQuery = { branch_id: branchId };
		if (size_category) {
			officeQuery.size_category = size_category;
		}
		let offices = await Office.find(officeQuery);

		// ترتيب حسب رقم المكتب
		offices = offices.sort((a, b) => {
			const aNum = parseInt(a.office_number.replace(/\D/g, "")) || 0;
			const bNum = parseInt(b.office_number.replace(/\D/g, "")) || 0;
			return aNum - bNum;
		});

		// 2️⃣ جلب الحجوزات المرتبطة بالمكاتب
		const bookings = await Booking.find({
			office_id: { $in: offices.map((o) => o._id) },
		}).populate("client_id");

		// ✅ 3️⃣ تصفية الحجوزات النشطة فقط (بشكل صحيح)
		const activeBookings = bookings.filter((b) => {
			if (b.status !== "active") return false;
			if (!b.end_date) return false;
			const end = new Date(b.end_date);
			return !isNaN(end); // تاريخ صالح
		});

		// 🟢 حساب عدد الحجوزات التي تنتهي هذا الشهر
		const expiringThisMonth = activeBookings.filter((b) => {
			const end = new Date(b.end_date);
			return end >= today && end <= endOfMonth;
		}).length;

		// 📌 للتأكيد: طباعة في الكونسول
		console.log("===== 📅 Expiring Bookings This Month =====");
		activeBookings.forEach((b) => {
			const end = new Date(b.end_date);
			if (end >= today && end <= endOfMonth) {
				console.log(`- ${b._id} → ${end.toISOString().split("T")[0]}`);
			}
		});

		const bookedOfficeIds = activeBookings.map((b) => b.office_id.toString());

		// 4️⃣ فلترة المكاتب المعروضة
		let filteredOffices = offices;
		if (filter === "available") {
			filteredOffices = offices.filter((o) => !bookedOfficeIds.includes(o._id.toString()));
		} else if (filter === "booked") {
			filteredOffices = offices.filter((o) => bookedOfficeIds.includes(o._id.toString()));
		}

		// 5️⃣ حساب التفتيشات المجانية
		const inspections = await Inspection.find({
			booking_id: { $in: activeBookings.map((b) => b._id) },
		});

		const inspectionStatusMap = {};
		activeBookings.forEach((booking) => {
			const doneFreeInspections = inspections.filter(
				(ins) =>
					ins.booking_id.toString() === booking._id.toString() &&
					["labor", "bank"].includes(ins.type) &&
					ins.status === "done"
			);
			inspectionStatusMap[booking._id.toString()] = 2 - doneFreeInspections.length;
		});

		// 6️⃣ إرسال البيانات للعرض
		res.render("bookingOffices", {
			offices: filteredOffices,
			branchId,
			bookedOfficeIds,
			bookings: activeBookings,
			inspectionStatusMap,
			filter,
			size_category,
			totalOffices: offices.length,
			totalBooked: bookedOfficeIds.length,
			totalAvailable: offices.length - bookedOfficeIds.length,
			expiringThisMonth,
		});
	} catch (err) {
		console.error("❌ Error loading offices:", err);
		res.status(500).send("Error loading offices");
	}
});


router.get("/new/:officeId", async (req, res) => {
	try {
		const office = await Office.findById(req.params.officeId).populate("branch_id");
		const clients = await Client.find();
		res.render("bookingNew", { office, clients });
	} catch (err) {
		res.status(500).send("Error loading new booking form");
	}
});

router.post("/", async (req, res) => {
	try {
		const {
			office_id,
			client_id,	
			page_no,
			start_date,
			end_date,
			down_payment,

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
			payments: [{ amount: down_payment, payment_date: new Date(), payment_type: "initial" }],
			cheques: chequesArray,
		});
		await booking.save();
		await Inspection.insertMany([
			{ booking_id: booking._id, type: "labor", paid: false },
			{ booking_id: booking._id, type: "bank", paid: false },
		]);
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
		await page.pdf({ path: pdfPath, format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
		await browser.close();
		res.redirect("/bookings/success");
	} catch (err) {
		console.error("❌ Error creating booking:", err);
		res.status(500).send("Error creating booking");
	}
});
router.get("/view/:bookingId", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId)
			.populate({
				path: "office_id",
				populate: { path: "branch_id" } // ✅ لعرض اسم الفرع
			})
			.populate("client_id"); // ✅ لعرض بيانات العميل

		if (!booking) return res.status(404).send("Booking not found");

		const inspections = await Inspection.find({ booking_id: booking._id });

		// ✅ حساب عدد التفتيشات المجانية اللي اتعملت
		const freeTypes = ["labor", "bank"];
		const completedFree = inspections.filter((i) => freeTypes.includes(i.type) && i.status === "done").length;
		const remainingFree = 2 - completedFree;

		res.render("bookingView", { booking, inspections, remainingFree });
	} catch (err) {
		console.error("❌ Error loading booking view:", err);
		res.status(500).send("Error loading booking view");
	}
});
router.get("/archive", async (req, res) => {
	try {
		const clientFilter = req.query.client;
		let query = { status: "archived" };
		if (clientFilter) {
			query = { ...query, client_id: { $in: await Client.find({ name: { $regex: clientFilter, $options: "i" } }).distinct("_id") } };
		}
		const archivedBookings = await Booking.find(query).populate("office_id").populate("client_id");
		res.render("bookingArchive", { archivedBookings, client: clientFilter });
	} catch (err) {
		res.status(500).send("Error loading archive");
	}
});

router.post("/:bookingId/archive", async (req, res) => {
	try {
		const cancel_reason = req.body.cancel_reason || "تم الإلغاء بدون تحديد السبب";
		const booking = await Booking.findByIdAndUpdate(req.params.bookingId, { status: "archived", cancel_reason });
		await Office.findByIdAndUpdate(booking.office_id, { status: "available", currentBooking: null });
		res.redirect("/bookings/view/" + req.params.bookingId);
	} catch (err) {
		res.status(500).send("Error archiving booking");
	}
});

router.post("/:bookingId/cheques/:chequeIndex/toggle-collected", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId);
		const chequeIndex = parseInt(req.params.chequeIndex);
		if (!booking || !booking.cheques[chequeIndex]) return res.status(404).send("Cheque not found");
		booking.cheques[chequeIndex].collected = !booking.cheques[chequeIndex].collected;
		await booking.save();
		res.redirect(`/bookings/view/${booking._id}`);
	} catch (err) {
		res.status(500).send("Error toggling cheque collected");
	}
});

router.get("/success", (req, res) => {
	res.render("bookingSuccess");
});

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
			cheques: (booking.cheques || []).map((chq) => ({ date: chq.date ? new Date(chq.date).toISOString().split("T")[0] : "", amount: chq.amount || 0 })),
		});
		const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: "networkidle0" });
		const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
		await browser.close();
		const filename = `Tenancy_Contract_${booking._id}.pdf`;
		res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` });
		res.send(pdfBuffer);
	} catch (err) {
		console.error("❌ Error generating contract:", err);
		res.status(500).send("Error generating contract");
	}
});

router.get("/archive/:bookingId", async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.bookingId)
			.populate("office_id")
			.populate({ path: "office_id", populate: { path: "branch_id" } })
			.populate("client_id");
		if (!booking || booking.status !== "archived") return res.status(404).send("Archived booking not found");
		res.render("bookingArchivedView", { booking });
	} catch (err) {
		console.error("❌ Error loading archived booking details:", err);
		res.status(500).send("Error loading archived booking details");
	}
});


router.get("/:bookingId/tax-invoice", async (req, res) => {
  try {
    console.log("📌 Fetching booking...");
    const booking = await Booking.findById(req.params.bookingId)
      .populate({
        path: "office_id",
        populate: { path: "branch_id" }
      })
      .populate("client_id");

    if (!booking) {
      console.log("❌ Booking not found");
      return res.status(404).send("Booking not found");
    }

    // ✅ حساب مبالغ الفاتورة
    const invoiceTotal = booking.total_price || 0;
    const vatAmount = booking.vat || 0;
    const taxableAmount = invoiceTotal - vatAmount;

    // ✅ مسار قالب EJS
    const templatePath = path.join(__dirname, "../templates/taxInvoiceTemplate.ejs");
    console.log("📄 Template path:", templatePath);

    // ✅ بيانات للقالب
    const html = await ejs.renderFile(
      templatePath,
      {
        client: {
          name: booking.client_id?.name || booking.client_id?.registered_owner_name || "",
          trn: booking.client_id?.trn || "---",
          phone: booking.client_id?.phone || "",
          email: booking.client_id?.email || "",
        },
        company: {
          trn: "000000000000000", // أو اجلبه من config
          bank_name: "Emirates NBD",
          account_number: "1234567890",
          iban: "AE12 3456 7890 1234 5678 90",
          swift: "EBILAEAD"
        },
        contract: {
          period: `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`
        },
        office: {
          unit_number: booking.office_id?.office_number || "",
          location: booking.office_id?.branch_id?.name || ""
        },
        invoice: {
          number: `INV-${booking._id.toString().slice(-6)}`,
          date: new Date().toLocaleDateString(),
          total: invoiceTotal,
          total_in_words: "Twenty-One Thousand Dirhams Only", // يمكن استبدالها لاحقًا بمكتبة تحويل رقم لكلمات
          items: [
            {
              description: "Office Rent",
              qty: 1,
              rate: taxableAmount,
              gross: taxableAmount,
              discount: 0,
              taxable: taxableAmount,
              vat_rate: "5%",
              vat_amount: vatAmount,
              total: invoiceTotal,
              vat_key: "SR1"
            }
          ]
        }
      },
      {
        filename: templatePath,
        views: [path.join(__dirname, "../templates")]
      }
    );

    console.log("🧾 Rendering HTML...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
    });

    await browser.close();
    console.log("✅ PDF generated successfully");

    const filename = `Tax_Invoice_${booking._id}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating tax invoice:", err);
    res.status(500).send("Error generating tax invoice");
  }
});

router.post("/:bookingId/cheques/:index/mark-collected", async (req, res) => {
  const { bookingId, index } = req.params;
  const { note } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.cheques[index]) return res.status(404).send("Booking or Cheque not found");

    booking.cheques[index].collected = true;
    booking.cheques[index].collected_at = new Date();  // 🕒 تاريخ التحصيل
    booking.cheques[index].note = note || "";          // ✍️ الملاحظة

    await booking.save();
    res.redirect(`/bookings/view/${bookingId}`);
  } catch (err) {
    console.error("❌ Error marking cheque as collected:", err);
    res.status(500).send("Error updating cheque");
  }
});


module.exports = router;
