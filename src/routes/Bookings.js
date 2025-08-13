const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const Branch = require("../models/Branch");
const Office = require("../models/Office");
const Client = require("../models/Client");
const TaxInvoice = require('../models/TaxInvoice'); // لو عملت الموديل الجديد

const Inspection = require("../models/Inspection");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const numberToWords = require('number-to-words');
const { authenticateJWT, hasPermission } = require('../middlewares/auth');


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

router.get("/",
	authenticateJWT,
	async (req, res) => {
		try {
			let query = {};

			// ✨ لو المستخدم مربوط بفرع ➜ يعرضه بس
			if (req.user.branch) {
				query._id = req.user.branch;
			}

			const branches = await Branch.find(query);

			res.render("bookingBranches", {
				branches,
				user: req.user // مهم لو هتستخدمه في EJS
			});
		} catch (err) {
			console.error(err);
			res.status(500).send("Error loading branches");
		}
	}
);
router.get("/branch/:branchId",authenticateJWT, async (req, res) => {
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
				(ins) => ins.booking_id.toString() === booking._id.toString() && ["labor", "bank"].includes(ins.type) && ins.status === "done"
			);
			inspectionStatusMap[booking._id.toString()] = 2 - doneFreeInspections.length;
		});
const branch = await Branch.findById(branchId);

		// 6️⃣ إرسال البيانات للعرض
		res.render("bookingOffices", {
  user: req.user, 
  offices: filteredOffices,
  branchId,
   branch, 
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

router.get("/new/:officeId",authenticateJWT, async (req, res) => {
	try {
		const office = await Office.findById(req.params.officeId).populate("branch_id");
		const clients = await Client.find();
		res.render("bookingNew", {  user: req.user,office, clients });
	} catch (err) {
		res.status(500).send("Error loading new booking form");
	}
});

// router.post("/", async (req, res) => {
//   try {
//     const {
//       office_id,
//       client_id,
//       page_no,
//       start_date,
//       end_date,
//       down_payment,
//       cheques,
//       total_price,
//       vat,
//       sec_deposit,
//       admin_fee,
//       commission,
//       ejari,
//       rent_amount,
//       registration_fee,
//     } = req.body;

//     // ✅ تحقق من أن Start Date قبل End Date
//     const start = new Date(start_date);
//     const end = new Date(end_date);
//     if (start >= end) {
//       return res.status(400).send("❌ Start Date must be before End Date");
//     }

//     // ✅ نظف الأرقام
//     const totalPriceClean = Number(String(total_price).replace(/,/g, "")) || 0;
//     const vatClean = Number(vat) || 0;
//     const secDepositClean = Number(sec_deposit) || 0;
//     const adminFeeClean = Number(admin_fee) || 0;
//     const commissionClean = Number(commission) || 0;
//     const rentAmountClean = Number(rent_amount) || 0;
//     const regFeeClean = Number(registration_fee) || 0;
//     const downPaymentClean = Number(down_payment) || 0;

//     // ✅ جهز cheques Array
//     const chequesArray = cheques ? Object.values(cheques) : [];

//     // ✅ أضف Down Payment كشيك محصل لو > 0
//     if (downPaymentClean > 0) {
//       chequesArray.push({
//         amount: downPaymentClean,
//         due_date: start,          // نفس تاريخ بداية الحجز
//         collected: true,
//         collected_at: start,      // تم تحصيله فورًا
//         note: "Down Payment"
//       });
//     }

//     // ✅ أنشئ الحجز
//     const booking = new Booking({
//       office_id,
//       client_id,
//       page_no,
//       start_date: start,
//       end_date: end,
//       initial_payment: downPaymentClean,
//       total_price: totalPriceClean,
//       vat: vatClean,
//       sec_deposit: secDepositClean,
//       admin_fee: adminFeeClean,
//       commission: commissionClean,
//       rent_amount: rentAmountClean,
//       registration_fee: regFeeClean,
//       ejari_no: ejari,
//       payments: [
//         {
//           amount: downPaymentClean,
//           payment_date: start,   // مهم: تاريخ التحصيل
//           payment_type: "initial",
//         },
//       ],
//       cheques: chequesArray,
//     });

//     await booking.save();

//     // ✅ أنشئ التفتيشات تلقائيًا
//     await Inspection.insertMany([
//       { booking_id: booking._id, type: "labor", paid: false },
//       { booking_id: booking._id, type: "bank", paid: false },
//     ]);

//     res.redirect("/bookings/success");
//   } catch (err) {
//     console.error("❌ Error creating booking:", err);
//     res.status(500).send("Error creating booking");
//   }
// });


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
      rent_amount,
      registration_fee,
    } = req.body;

    // ✅ تحقق من أن Start Date قبل End Date
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (start >= end) {
      return res.status(400).send("❌ Start Date must be before End Date");
    }

    // ✅ نظف الأرقام
    const totalPriceClean = Number(String(total_price).replace(/,/g, "")) || 0;
    const vatClean = Number(vat) || 0;
    const secDepositClean = Number(sec_deposit) || 0;
    const adminFeeClean = Number(admin_fee) || 0;
    const commissionClean = Number(commission) || 0;
    const rentAmountClean = Number(rent_amount) || 0;
    const regFeeClean = Number(registration_fee) || 0;
    const downPaymentClean = Number(down_payment) || 0;

    // ✅ جهز cheques Array (من غير ما نضيف الداون بيمنت)
const chequesArray = cheques
  ? Object.values(cheques).filter((c) => {
      const isSameAmount = Number(c.amount) === downPaymentClean;
      const isSameDate = c.due_date && new Date(c.due_date).toISOString().split("T")[0] === start.toISOString().split("T")[0];
      const isDuplicateDownPayment = isSameAmount && isSameDate;

      if (isDuplicateDownPayment) {
        console.warn("⚠️ Duplicate Down Payment detected in cheques — skipping it.");
        console.table({
          amount: c.amount,
          due_date: c.due_date,
          down_payment: downPaymentClean,
          start_date: start.toISOString().split("T")[0],
        });
      }

      return !isDuplicateDownPayment;
    })
  : [];



    // ✅ أنشئ الحجز
    const booking = new Booking({
      office_id,
      client_id,
      page_no,
      start_date: start,
      end_date: end,
      initial_payment: downPaymentClean,
      total_price: totalPriceClean,
      vat: vatClean,
      sec_deposit: secDepositClean,
      admin_fee: adminFeeClean,
      commission: commissionClean,
      rent_amount: rentAmountClean,
      registration_fee: regFeeClean,
      ejari_no: ejari,

      // ✅ الداون بيمنت بيتسجل هنا فقط
      payments: [
        {
          amount: downPaymentClean,
          payment_date: start,
          payment_type: "initial",
        },
      ],

      // ✅ الشيكات من الفورم (بدون الداون بيمنت)
      cheques: chequesArray,
    });

    await booking.save();

    // ✅ أنشئ التفتيشات تلقائيًا
    await Inspection.insertMany([
      { booking_id: booking._id, type: "labor", paid: false },
      { booking_id: booking._id, type: "bank", paid: false },
    ]);

    res.redirect("/bookings/success");
  } catch (err) {
    console.error("❌ Error creating booking:", err);
    res.status(500).send("Error creating booking");
  }
});

router.get("/view/:bookingId",authenticateJWT, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate({
        path: "office_id",
        populate: { path: "branch_id" },
      })
      .populate("client_id");

    if (!booking) return res.status(404).send("Booking not found");

    const inspections = await Inspection.find({ booking_id: booking._id });

    // ✅ عدد التفتيشات المجانية
    const freeTypes = ["labor", "bank"];
    const completedFree = inspections.filter(
      (i) => freeTypes.includes(i.type) && i.status === "done"
    ).length;
    const remainingFree = 2 - completedFree;

    // ✅ تحميل الفواتير الضريبية المرتبطة بالحجز
    const invoices = await TaxInvoice.find({ booking_id: booking._id });

    res.render("bookingView", {   user: req.user,booking, inspections, remainingFree, invoices });
  } catch (err) {
    console.error("❌ Error loading booking view:", err);
    res.status(500).send("Error loading booking view");
  }
});

// 📦 Archive Route
router.get("/archive",
  authenticateJWT,
  async (req, res) => {
    try {
      const clientFilter = req.query.client;
      let query = { status: "archived" };

      // ✅ فلترة حسب client لو فيه search
      if (clientFilter) {
        const matchingClients = await Client.find({
          name: { $regex: clientFilter, $options: "i" },
        }).distinct("_id");

        query.client_id = { $in: matchingClients };
      }

      // ✅ فلترة حسب الفرع
      if (req.user.branch) {
        // هات الـ offices اللي فرعها نفس فرع المستخدم
        const allowedOffices = await Office.find({
          branch_id: req.user.branch
        }).distinct('_id');

        query.office_id = { $in: allowedOffices };
      }
      // ✅ لو branch = null ➜ يشوف كل الـ bookings (مفيش شرط)

      // ✅ Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const totalBookings = await Booking.countDocuments(query);
      const totalPages = Math.ceil(totalBookings / limit);

      const archivedBookings = await Booking.find(query)
        .populate({
          path: "office_id",
          populate: { path: "branch_id" },
        })
        .populate("client_id")
        .sort({ start_date: -1 })
        .skip(skip)
        .limit(limit);

      res.render("bookingArchive", {
        archivedBookings,
        client: clientFilter,
        totalPages,
        currentPage: page,
        limit,
        user: req.user // لو هتستخدمه في الصفحة
      });

    } catch (err) {
      console.error("❌ Error loading archive:", err);
      res.status(500).send("Error loading archive");
    }
  }
);


router.post("/:bookingId/archive", async (req, res) => {
  try {
    const cancel_reason = req.body.cancel_reason || "تم الإلغاء بدون تحديد السبب";

    // ✅ حمل الحجز
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).send("Booking not found");

    // ✅ غيّر حالته للأرشيف + السبب + تاريخ الإلغاء
    booking.status = "archived";
    booking.cancel_reason = cancel_reason;
    booking.cancel_date = new Date(); // ✅ هنا تاريخ الإلغاء بيتسجل

    // ✅ Cancel الشيكات الغير محصلة
    if (booking.cheques && booking.cheques.length > 0) {
      booking.cheques = booking.cheques.map((cheque) => {
        if (!cheque.collected) {
          cheque.canceled = true;  // لازم يكون موجود في Schema
          cheque.cancel_date = new Date();
        }
        return cheque;
      });
    }

    await booking.save();

    // ✅ فضّي المكتب المرتبط
    await Office.findByIdAndUpdate(
      booking.office_id,
      { status: "available", currentBooking: null }
    );

    res.redirect("/bookings/view/" + req.params.bookingId);
  } catch (err) {
    console.error("❌ Error archiving booking:", err);
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

router.get("/success", authenticateJWT, (req, res) => {
	res.render("bookingSuccess", {
    user: req.user // ✅ ابعته عشان الـ header يشوفه
  });
});

router.get("/:bookingId/generate-contract", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("office_id")
      .populate({ path: "office_id", populate: { path: "branch_id" } })
      .populate("client_id");

    if (!booking) return res.status(404).send("Booking not found");

    console.log("📌 Booking:", booking);

    const templatePath = path.join(__dirname, "../templates/contractTemplate.ejs");
    console.log("✅ Template Path:", templatePath);

    const cheques = (booking.cheques || []).map((chq) => ({
      date: chq.due_date ? new Date(chq.due_date).toISOString().split("T")[0] : "",
      amount: chq.amount || 0,
      collected: chq.collected,
      collected_at: chq.collected_at
        ? new Date(chq.collected_at).toISOString().split("T")[0]
        : "",
      note: chq.note || "",
    }));

    const initial_payment = booking.initial_payment || 0;
    const chequeTotal = cheques.reduce((sum, c) => sum + (c.amount || 0), 0);
    const grandTotal = initial_payment + chequeTotal;

    const templateData = {

       security_deposit: Number(booking.sec_deposit) || 0,
  admin_fee: Number(booking.admin_fee) || 0,
      // بيانات العميل
      tenant_name: booking.client_id?.registered_owner_name_ar || "",
      tenant_company_ar: booking.client_id?.company_ar || "",
      tenant_company_en: booking.client_id?.company_en || "",
      license_no: booking.client_id?.license_number || "",
      email: booking.client_id?.email || "",
      phone: booking.client_id?.mobile || "",
      license_expiry: booking.client_id?.license_expiry
        ? new Date(booking.client_id.license_expiry).toISOString().split("T")[0]
        : "",
      trn: booking.client_id?.trn || "",

      // بيانات المكتب والحجز
      unit_number: booking.office_id?.office_number || "",
      registration_fee: booking.registration_fee || 0,
      vat: booking.vat || 0,
      commission: booking.commission || 0,
   
      office_rent: booking.rent_amount || 0,
      total_price: booking.total_price || 0,
      start_date: booking.start_date
        ? new Date(booking.start_date).toISOString().split("T")[0]
        : "",
      end_date: booking.end_date
        ? new Date(booking.end_date).toISOString().split("T")[0]
        : "",
      branch_en: booking.office_id?.branch_id?.name || "",
      branch_ar: booking.office_id?.branch_id?.name_ar || "",
      location_en: booking.office_id?.branch_id?.location || "",
      whatsapp_number: booking.office_id?.branch_id?.whatsapp_number || "",

      // الدفع
      cheques,
      initial_payment,
      chequeTotal,
      grandTotal,
    };

    // ✅ أطبع القيم للتأكيد
    console.log("✅ Data to EJS:", templateData);

    const html = await ejs.renderFile(templatePath, templateData);

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
    console.error("❌ FULL Error:", err);
    res.status(500).send("Error generating contract");
  }
});


router.get("/archive/:bookingId", authenticateJWT, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate({
        path: "office_id",
        populate: { path: "branch_id" },
      })
      .populate("client_id");

    // ✅ تأكد إنه مؤرشف فعلاً
    if (!booking || booking.status !== "archived") {
      return res.status(404).send("Archived booking not found");
    }

    // ✅ لو مفيش cancel_date احسبه أو سيبه undefined
    // مثلا لو عندك حقل archived_at في الـ DB ممكن تستخدمه
    // booking.cancel_date = booking.cancel_date || booking.archived_at;

    res.render("bookingArchivedView", {user: req.user, booking });
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
        populate: { path: "branch_id" },
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

    console.log({
      invoiceTotal,
      vatAmount,
      taxableAmount,
    });

    const templatePath = path.join(__dirname, "../templates/taxInvoiceTemplate.ejs");

    const html = await ejs.renderFile(
      templatePath,
      {
client: {
  name: booking.client_id?.company_en || "---",
  trn: booking.client_id?.trn || "---",
  phone: booking.client_id?.phone || booking.client_id?.mobile || "",
  email: booking.client_id?.email || "",
},

        company: {
          name: "Your Own Business Center",
          address: "Zalfa Building, Al Garhoud, Dubai, UAE",
          trn: "000000000000000",
          phone: "+971 4 529 4459",
          email: "yourown781@gmail.com",
          bank_name: "Emirates NBD",
          account_number: "1234567890",
          iban: "AE12 3456 7890 1234 5678 90",
          swift: "EBILAEAD",
        },
        contract: {
          period: `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`,
        },
        office: {
          unit_number: booking.office_id?.office_number || "",
          location: booking.office_id?.branch_id?.name || "",
        },
        invoice: {
          number: `INV-${booking._id.toString().slice(-6)}`,
          date: new Date().toLocaleDateString(),
          taxable_amount: taxableAmount,
          vat_amount: vatAmount,
          total: invoiceTotal,
          total_in_words: "Twenty-One Thousand Dirhams Only",
          items: [
            {
              description: "Office Rent",
              qty: 1,
              rate: taxableAmount,
              taxable: taxableAmount,
              vat_rate: "5%",
              vat_amount: vatAmount,
              total: invoiceTotal
            }
          ],
        },
      },
      {
        filename: templatePath,
      }
    );

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
    const filename = `Tax_Invoice_${booking._id}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating tax invoice:", err);
    res.status(500).send("Error generating tax invoice");
  }
});



router.post("/:bookingId/cheques/:index/mark-collected", async (req, res) => {
  const { bookingId, index } = req.params;
  const { note, collected_date } = req.body; // ✅ استقبل التاريخ من الـ Form

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.cheques[index]) return res.status(404).send("Booking or Cheque not found");

    booking.cheques[index].collected = true;

    // ✅ خزن التاريخ اللي المستخدم اختاره أو fallback على التاريخ الحالي
    booking.cheques[index].collected_at = collected_date ? new Date(collected_date) : new Date();

    booking.cheques[index].note = note || "";

    await booking.save();
    res.redirect(`/bookings/view/${bookingId}`);
  } catch (err) {
    console.error("❌ Error marking cheque as collected:", err);
    res.status(500).send("Error updating cheque");
  }
});


router.post("/:bookingId/cheques/:index/add-payment", async (req, res) => {
  const { bookingId, index } = req.params;
  const { paid_amount, paid_date, note } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking || !booking.cheques[index]) return res.status(404).send("Not found");

  booking.cheques[index].payments.push({
    paid_amount: parseFloat(paid_amount),
    paid_date: new Date(paid_date),
    note: note || "",
  });

  const totalPaid = booking.cheques[index].payments.reduce((sum, p) => sum + p.paid_amount, 0);

  if (totalPaid >= booking.cheques[index].amount) {
    booking.cheques[index].collected = true;
    booking.cheques[index].collected_at = new Date();
  } else {
    booking.cheques[index].collected = false;
    booking.cheques[index].collected_at = null;
  }

  await booking.save();
  res.redirect(`/bookings/view/${bookingId}`);
});



router.post('/:bookingId/tax-invoice/update', async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return res.status(404).send('Booking not found');

  const taxInvoiceData = {
    company: {
      name: req.body.company_name,
      address: req.body.company_address,
      trn: req.body.company_trn,
      phone: req.body.company_phone,
      email: req.body.company_email,
      bank_name: req.body.company_bank_name,
      account_number: req.body.company_account_number,
      iban: req.body.company_iban,
      swift: req.body.company_swift,
    },
    client: {
      name: req.body.client_name,
      trn: req.body.client_trn,
      phone: req.body.client_phone,
      email: req.body.client_email,
    },
    contract: {
      period: req.body.contract_period,
    },
    office: {
      unit_number: req.body.office_unit,
      location: req.body.office_location,
    },
    invoice: {
      number: req.body.invoice_number,
      date: req.body.invoice_date,
      taxable_amount: req.body.invoice_taxable_amount,
      vat_amount: req.body.invoice_vat_amount,
      total: req.body.invoice_total,
      total_in_words: req.body.invoice_total_in_words,
      items: req.body.items ? Object.values(req.body.items) : [],
    },
  };

  const invoiceNumber = req.body.invoice_number;

  await TaxInvoice.findOneAndUpdate(
    { booking_id: booking._id, invoice_number: invoiceNumber },
    { booking_id: booking._id, invoice_number: invoiceNumber, data: taxInvoiceData, updated_at: new Date() },
    { upsert: true, new: true }
  );

  res.redirect(`/bookings/${booking._id}/tax-invoice/${invoiceNumber}/view`);
});

// ✅ Route: View Tax Invoice with invoice_number
router.get('/:bookingId/tax-invoice/:invoiceNumber/view', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const invoiceNumber = req.params.invoiceNumber;

    console.log("📌 === Debug Tax Invoice View ===");
    console.log("🔍 Looking for booking_id:", bookingId);
    console.log("🔍 Looking for invoice_number:", invoiceNumber);

    const taxInvoice = await TaxInvoice.findOne({
      booking_id: bookingId,
      invoice_number: invoiceNumber
    });

    if (!taxInvoice) {
      console.log("❌ Tax Invoice not found");
      return res.status(404).send("❌ Tax Invoice not found");
    }

    console.log("✅ Raw Tax Invoice Result:", taxInvoice);

    const templateData = taxInvoice.data;

    // ✅ Generate Amount in words dynamically
    const totalAmount = Number(templateData.invoice.total) || 0;

    let rawWords = numberToWords.toWords(totalAmount);
    rawWords = rawWords.replace(/ thousand /, " thousand, ");
    const capitalized = rawWords.charAt(0).toUpperCase() + rawWords.slice(1);

    templateData.invoice.total_in_words = `${capitalized} Dirhams Only`;

    console.log("✅ ✅ ✅ Stored Data:", JSON.stringify(templateData, null, 2));

    // ✅ Use your correct template path
    const templatePath = path.join(__dirname, "../views/templates/taxInvoiceTemplate.ejs");

    const html = await ejs.renderFile(templatePath, templateData);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Tax_Invoice_${taxInvoice.invoice_number}.pdf"`,
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Error generating Tax Invoice View:", err);
    res.status(500).send("Server Error");
  }
});




router.get('/:bookingId/tax-invoice/:invoiceNumber/edit', async (req, res) => {
  // 🔢 Helper: split VAT @5%
  function splitVAT(amount, rate = 0.05) {
    const amt = Number(amount) || 0;
    const taxable = +(amt / (1 + rate)).toFixed(2);
    const vat = +(amt - taxable).toFixed(2);
    return { taxable, vat, total: +amt.toFixed(2) };
  }

  const booking = await Booking.findById(req.params.bookingId)
    .populate("client_id")
    .populate({
      path: "office_id",
      populate: { path: "branch_id" },
    });

  if (!booking) return res.status(404).send("Booking not found");

  const taxInvoice = await TaxInvoice.findOne({
    booking_id: booking._id,
    invoice_number: req.params.invoiceNumber
  });

  // ✅ لو فيه فاتورة محفوظة — استخدمها، لو لأ — جهّز داتا افتراضية
  let data;
  if (taxInvoice) {
    data = taxInvoice.data;
  } else {
    data = {
      company: {
        name: "YOUR OWN BUSINESS CENTER",
        address: "Zalfa Building, Al Garhoud, Dubai, UAE",
        trn: "000000000000000",
        phone: "04 529 4459",
        email: "yourown781@gmail.com",
        bank_name: "ABU DHABI COMMERCIAL BANK",
        account_number: "12854021920001",
        iban: "AE100030012854021920001",
        swift: "ADCBAEAAXXX",
      },
      client: {
        name: booking.client_id?.company_en || "",
        trn: booking.client_id?.trn || "",
        phone: booking.client_id?.mobile || "",
        email: booking.client_id?.email || "",
      },
      contract: {
        period: `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`,
      },
      office: {
        unit_number: booking.office_id?.office_number || "",
        location: booking.office_id?.branch_id?.name || "",
      },
      invoice: {
        number: req.params.invoiceNumber,
        date: new Date().toLocaleDateString(),
        taxable_amount: (booking.total_price || 0) - (booking.vat || 0),
        vat_amount: booking.vat || 0,
        total: booking.total_price || 0,
        total_in_words: "",
        items: [
          {
            description: "Booking",
            qty: 1,
            rate: ((booking.total_price || 0) - (booking.vat || 0)),
            taxable: ((booking.total_price || 0) - (booking.vat || 0)),
            vat_rate: "5%",
            vat_amount: booking.vat || 0,
            total: booking.total_price || 0,
          }
        ]
      }
    };
  }

  // 🧾 جهّز عناصر الفاتورة من المدفوعات (داون بيمنت + مدفوعات شيكات)
  const itemsFromPayments = [];

  // 1) الداون بيمنت (payments.payment_type === "initial")
  (booking.payments || []).forEach((p, idx) => {
    if (p && p.amount > 0 && p.payment_type === "initial") {
      const { taxable, vat, total } = splitVAT(p.amount, 0.05);
      itemsFromPayments.push({
        description: "Advance Payment",
        qty: 1,
        rate: taxable,
        taxable,
        vat_rate: "5%",
        vat_amount: vat,
        total,
        _meta: { paid_date: p.payment_date, kind: "initial", idx }
      });
    }
  });

  // 2) مدفوعات الشيكات الجزئية (cheque.payments[])
  (booking.cheques || []).forEach((chq, cIdx) => {
    (chq.payments || []).forEach((pp, pIdx) => {
      if (pp && pp.paid_amount > 0) {
        const { taxable, vat, total } = splitVAT(pp.paid_amount, 0.05);
        itemsFromPayments.push({
          description: "Monthly Payment Collection",
          qty: 1,
          rate: taxable,
          taxable,
          vat_rate: "5%",
          vat_amount: vat,
          total,
          _meta: {
            due_date: chq.due_date,
            paid_date: pp.paid_date,
            note: pp.note || "",
            kind: "cheque_payment",
            cheque_index: cIdx,
            payment_index: pIdx
          }
        });
      }
    });
  });

  res.render("taxInvoiceEditable", {
    bookingId: booking._id,
    company: data.company,
    client: data.client,
    contract: data.contract,
    office: data.office,
    invoice: data.invoice,
    paymentsItems: itemsFromPayments // << مهم
  });
});





router.get("/:bookingId/tax-invoice/view", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // 🔍 دور على الفاتورة
    const taxInvoice = await TaxInvoice.findOne({ booking_id: bookingId });
    if (!taxInvoice) {
      return res.status(404).send("❌ Tax Invoice not found");
    }

    const templateData = taxInvoice.data;

    // ✅ توليد Amount in words بصيغة مرتبة
    const totalAmount = Number(templateData.invoice.total) || 0;

    let rawWords = numberToWords.toWords(totalAmount);
    rawWords = rawWords.replace(/ thousand /, " thousand, "); // كوما لو حابب
    const capitalized = rawWords.charAt(0).toUpperCase() + rawWords.slice(1);

    templateData.invoice.total_in_words = `${capitalized} Dirhams Only`;

    // ✅ مسار القالب
    const templatePath = path.join(__dirname, "../views/templates/taxInvoiceTemplate.ejs");

    // ✅ Render
    const html = await ejs.renderFile(templatePath, templateData);

    // ✅ Puppeteer PDF
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

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Tax_Invoice_${taxInvoice.invoice_number}.pdf"`,
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Error generating Tax Invoice:", err);
    res.status(500).send("Server Error");
  }
});


// ✅ يعرض كل الفواتير الضريبية
router.get('/tax-invoices',  authenticateJWT,
  hasPermission('accounting.view'),async (req, res) => {
  const TaxInvoice = require('../models/TaxInvoice');
  const invoices = await TaxInvoice.find().populate({
    path: 'booking_id',
    populate: { path: 'client_id office_id' }
  }).sort({ created_at: -1 });

  res.render('taxInvoicesList', { invoices , user: req.user });
});

// ✅ من صفحة عرض العميل
router.get('/client/:clientId/tax-invoices', async (req, res) => {
  const bookings = await Booking.find({ client_id: req.params.clientId });
  const TaxInvoice = require('../models/TaxInvoice');
  const invoices = await TaxInvoice.find({
    booking_id: { $in: bookings.map(b => b._id) }
  }).populate('booking_id');

  res.render('taxInvoicesList', { invoices });
});

// ✅ NEW TAX INVOICE FORM
// ✅ توليد فاتورة جديدة برقم جديد
router.get("/:bookingId/tax-invoice/new", async (req, res) => {
  // 🔢 Helper
  function splitVAT(amount, rate = 0.05) {
    const amt = Number(amount) || 0;
    const taxable = +(amt / (1 + rate)).toFixed(2);
    const vat = +(amt - taxable).toFixed(2);
    return { taxable, vat, total: +amt.toFixed(2) };
  }

  const booking = await Booking.findById(req.params.bookingId)
    .populate("client_id")
    .populate({
      path: "office_id",
      populate: { path: "branch_id" },
    });

  if (!booking) return res.status(404).send("Booking not found");

  const lastInvoice = await TaxInvoice.findOne({ booking_id: booking._id })
    .sort({ created_at: -1 });

  let newInvoiceNumber = "INV-001";
  if (lastInvoice) {
    const lastNum = parseInt((lastInvoice.invoice_number || "INV-000").split("-")[1]) || 0;
    const next = String(lastNum + 1).padStart(3, "0");
    newInvoiceNumber = `INV-${next}`;
  }

  // 👇 جهّز عناصر من المدفوعات بدلاً من صف واحد
  const itemsFromPayments = [];

  // Down payment
  (booking.payments || []).forEach((p) => {
    if (p && p.amount > 0 && p.payment_type === "initial") {
      const { taxable, vat, total } = splitVAT(p.amount, 0.05);
      itemsFromPayments.push({
        description: "Advance Payment",
        qty: 1,
        rate: taxable,
        taxable,
        vat_rate: "5%",
        vat_amount: vat,
        total
      });
    }
  });

  // Cheque partial payments
  (booking.cheques || []).forEach((chq) => {
    (chq.payments || []).forEach((pp) => {
      if (pp && pp.paid_amount > 0) {
        const { taxable, vat, total } = splitVAT(pp.paid_amount, 0.05);
        itemsFromPayments.push({
          description: "Monthly Payment Collection",
          qty: 1,
          rate: taxable,
          taxable,
          vat_rate: "5%",
          vat_amount: vat,
          total
        });
      }
    });
  });

  const totals = itemsFromPayments.reduce((acc, it) => {
    acc.taxable += Number(it.taxable) || 0;
    acc.vat += Number(it.vat_amount) || 0;
    acc.total += Number(it.total) || 0;
    return acc;
  }, { taxable: 0, vat: 0, total: 0 });

  const defaultData = {
    company: {
      name: "YOUR OWN BUSINESS CENTER",
      address: "Zalfa Building, Al Garhoud, Dubai, UAE",
      trn: "000000000000000",
      phone: "04 529 4459",
      email: "yourown781@gmail.com",
      bank_name: "ABU DHABI COMMERCIAL BANK",
      account_number: "12854021920001",
      iban: "AE100030012854021920001",
      swift: "ADCBAEAAXXX",
    },
    client: {
      name: booking.client_id?.company_en || "",
      trn: booking.client_id?.trn || "",
      phone: booking.client_id?.mobile || "",
      email: booking.client_id?.email || "",
    },
    contract: {
      period: `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`,
    },
    office: {
      unit_number: booking.office_id?.office_number || "",
      location: booking.office_id?.branch_id?.name || "",
    },
    invoice: {
      number: newInvoiceNumber,
      date: new Date().toLocaleDateString(),
      taxable_amount: +totals.taxable.toFixed(2),
      vat_amount: +totals.vat.toFixed(2),
      total: +totals.total.toFixed(2),
      total_in_words: "",
      items: itemsFromPayments.length ? itemsFromPayments : [
        {
          description: "Booking",
          qty: 1,
          rate: (booking.total_price || 0) - (booking.vat || 0),
          taxable: (booking.total_price || 0) - (booking.vat || 0),
          vat_rate: "5%",
          vat_amount: booking.vat || 0,
          total: booking.total_price || 0
        }
      ]
    },
  };

  res.render("taxInvoiceEditable", {
    bookingId: booking._id,
    company: defaultData.company,
    client: defaultData.client,
    contract: defaultData.contract,
    office: defaultData.office,
    invoice: defaultData.invoice,
    paymentsItems: itemsFromPayments // << مهم
  });
});




module.exports = router;
