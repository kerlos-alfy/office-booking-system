const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const upload = require("../utils/multer");
const nationalities = require("../utils/nationalities");
const puppeteer = require("puppeteer");
const path = require("path");
const Booking = require("../models/Booking");
const TaxInvoice = require("../models/TaxInvoice");

// View all clients
// router.get("/", async (req, res) => {
// 	try {
// 		const clients = await Client.find();
// 		res.render("clients", { clients });
// 	} catch (err) {
// 		res.status(500).send("Error loading clients");
// 	}
// });

router.get("/", async (req, res) => {
  try {
    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : "";

    // ✅ لو فيه كلمة بحث نفلتر بيها الاسم
    let query = {};
    if (search) {
      query.company_en = { $regex: search, $options: "i" };
    }

    const totalClients = await Client.countDocuments(query);
    const totalPages = Math.ceil(totalClients / limit);

    const clients = await Client.find(query).skip(skip).limit(limit);

    res.render("clients", {
      clients,
      currentPage: page,
      totalPages,
      search // مهم عشان يرجعلك القيمة في الـ EJS
    });
  } catch (err) {
    console.error("❌ Error loading clients:", err);
    res.status(500).send("Error loading clients");
  }
});


// New Client Form
router.get("/new", (req, res) => {
	res.render("newClient", { nationalities });
});

// Save new client
// Save new client
router.post("/new", async (req, res) => {
	try {
		console.log("🚀 req.body:", req.body);
		const {
			mobile,
			company_en,
			company_ar,
			registered_owner_name_en,
			registered_owner_name_ar,
			nationality_en,
			nationality_ar,
			license_number,
			license_expiry,
			emirates_id_status,
			contract_status,
			license_status,
			ejari_no,
			trn,
			email // ✅ الحقول الجديدة
		} = req.body;

		const client = new Client({
			mobile,
			company_en,
			company_ar,
			registered_owner_name_en,
			registered_owner_name_ar,
			nationality_en,
			nationality_ar,
			license_number,
			license_expiry,
			emirates_id_status: String(emirates_id_status),
			contract_status: String(contract_status),
			license_status: String(license_status),
			ejari_no,
			trn,   // ✅ إضافة الرقم الضريبي
			email  // ✅ إضافة البريد الإلكتروني
		});

		await client.save();
		res.redirect("/clients");
	} catch (err) {
		console.error("Error saving client:", err);
		res.status(500).send("Error saving client");
	}
});

// Upload Page
router.get("/:clientId/upload", async (req, res) => {
	try {
		const client = await Client.findById(req.params.clientId);
		if (!client) {
			return res.status(404).send("Client not found");
		}

		res.render("clientUpload", { client });
	} catch (err) {
		res.status(500).send("Error loading upload page");
	}
});

// Upload POST
router.post(
  "/:clientId/upload",
  async (req, res, next) => {
    try {
      const client = await Client.findById(req.params.clientId);
      if (!client) return res.status(404).send("Client not found");

      // تجهيز اسم الفولدر من اسم الشركة وآخر 5 من ID
      const shortId = client._id.toString().slice(-5);
      const safeCompany = client.company_en.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
      req.clientFolderName = `${safeCompany}-${shortId}`;

      req.client = client; // نحفظ الـ client لاستخدامه لاحقًا بدون طلب تاني
      next();
    } catch (err) {
      console.error("Error setting client folder name:", err);
      res.status(500).send("Error preparing upload");
    }
  },
  upload.fields([
    { name: "license_file", maxCount: 1 },
    { name: "ejari_file", maxCount: 1 },
    { name: "emirates_id_file", maxCount: 1 },
    { name: "passport_file", maxCount: 1 },
    { name: "contract_file", maxCount: 1 },
    { name: "additional_files", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const client = req.client;
      const folderPath = `/uploads/clients/${req.clientFolderName}`;

      // 📄 License
      if (req.files["license_file"]) {
        client.license_file_path = `${folderPath}/` + req.files["license_file"][0].filename;
        client.license_status = "OK";
      }

      // 📄 Ejari
      if (req.files["ejari_file"]) {
        client.ejari_file_path = `${folderPath}/` + req.files["ejari_file"][0].filename;
      }

      // 🆔 Emirates ID
      if (req.files["emirates_id_file"]) {
        client.emirates_id_file_path = `${folderPath}/` + req.files["emirates_id_file"][0].filename;
        client.emirates_id_status = "OK";
      }

      // 📄 Contract
      if (req.files["contract_file"]) {
        client.contract_file_path = `${folderPath}/` + req.files["contract_file"][0].filename;
        client.contract_status = "OK";
      }

      // 🛂 Passport
      if (req.files["passport_file"]) {
        client.passport_file_path = `${folderPath}/` + req.files["passport_file"][0].filename;
      }

      // 🗂️ Additional Files
      if (req.files["additional_files"]) {
        client.additional_files = req.files["additional_files"].map((file) =>
          `${folderPath}/additional/` + file.filename
        );
      }

      await client.save();
      res.redirect("/clients");
    } catch (err) {
      console.error("Error uploading files:", err);
      res.status(500).send("Error uploading files");
    }
  }
);
// View Client Details
// ✅ View Client Details - مع الفواتير المرتبطة
router.get("/:clientId/view", async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).send("Client not found");

    // ✅ حمّل كل الحجوزات المرتبطة
    const bookings = await Booking.find({ client_id: client._id });

    // ✅ حمّل الفواتير المرتبطة بالحجوزات دي
    const invoices = bookings.length > 0
      ? await TaxInvoice.find({ booking_id: { $in: bookings.map(b => b._id) } })
      : [];

    console.log("✅ Client:", client.company_en);
    console.log("✅ Total Bookings:", bookings.length);
    console.log("✅ Total Invoices:", invoices.length);

    res.render("clientView", { client, invoices }); // مهم تبعته للـ EJS
  } catch (err) {
    console.error("❌ Error loading client details:", err);
    res.status(500).send("Error loading client details");
  }
});


// Edit Client Form
router.get("/:clientId/edit", async (req, res) => {
	try {
		const client = await Client.findById(req.params.clientId);
		if (!client) return res.status(404).send("Client not found");

		const nationalities = require("../utils/nationalities");
		res.render("editClient", { client, nationalities });
	} catch (err) {
		res.status(500).send("Error loading edit form");
	}
});

// Update Client
router.post("/:clientId/edit", async (req, res) => {
	try {
		const updateData = {
			mobile: req.body.mobile,
			company_en: req.body.company_en,
			company_ar: req.body.company_ar,
			registered_owner_name_en: req.body.registered_owner_name_en,
			registered_owner_name_ar: req.body.registered_owner_name_ar,
			nationality_en: req.body.nationality_en,
			nationality_ar: req.body.nationality_ar,
			emirates_id_status: req.body.emirates_id_status,
			contract_status: req.body.contract_status,
			license_status: req.body.license_status,
			ejari_no: req.body.ejari_no,
			license_number: req.body.license_number,
			license_expiry: req.body.license_expiry,
			trn: req.body.trn,       // ✅
			email: req.body.email    // ✅
		};

		await Client.findByIdAndUpdate(req.params.clientId, updateData);
		res.redirect(`/clients/${req.params.clientId}/view`);
	} catch (err) {
		console.error("Error updating client:", err);
		res.status(500).send("Error updating client");
	}
});


router.get("/:clientId/invoice", async (req, res) => {
	const client = await Client.findById(req.params.clientId);

	if (!client) return res.status(404).send("Client not found");

	res.render("invoice", {
		invoice: {
			number: `INV-${client._id.toString().slice(-6)}`,
			date: new Date().toLocaleDateString("en-GB"),
			trn: client.trn || "N/A",  // ✅ استخدام TRN من قاعدة البيانات
			contract_no: "200222",
			contract_period: "15-07-2024 to 14-07-2025",
			unit_no: "OFF-A,Shop1&2",
			unit_type: "Shop",
			property: "Al Maskan",
			location: "Al Karama",
			currency: "AED",
		},
		client: {
			name: client.company_en,
			branch: client.registered_owner_name_en,
			phone: client.mobile,
			email: client.email || "N/A",   // ✅ إيميل العميل
			trn: client.trn || "N/A",       // ✅ TRN داخل كائن client (اختياري لو بتستخدمه في التصميم)
			address: "Dubai, UAE"
		},
		items: [
			{
				description: "Basic rent",
				qty: 1,
				rate: 60000,
				gross: 60000,
				discount: 0,
				taxable: 60000,
				vat_rate: 5,
				vat_amount: 3000,
				total: 63000,
				vat_key: "S2",
			},
		],
		summary: {
			taxable: 60000,
			non_taxable: 0,
			total: 60000,
			vat: 3000,
			advance: 0,
			grand_total: 63000,
			total_in_words: "AED Sixty-Three Thousand Only",
			payment_terms: "Immediate",
		},
		payment: {
			cheque_to: "Saeed Mohamed Saeed Alghandi",
			beneficiary: "Oman Transport Establishment",
			bank: "Commercial Bank of Dubai",
			account: "1000081800",
			iban: "AE180230000001000081800",
			swift: "CBDUAEAD",
		},
	});
});

router.get("/:clientId/invoice/download", async (req, res) => {
	const client = await Client.findById(req.params.clientId);
	if (!client) return res.status(404).send("Client not found");

	const expressApp = req.app;

	// 🧠 أنشئ URL محلي لصفحة الفاتورة
	const invoiceUrl = `${req.protocol}://${req.get("host")}/clients/${client._id}/invoice`;

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto(invoiceUrl, {
		waitUntil: "networkidle0",
	});

	const pdfBuffer = await page.pdf({
		format: "A4",
		printBackground: true,
	});

	await browser.close();

	// 📦 رجّع PDF للتحميل
	res.set({
		"Content-Type": "application/pdf",
		"Content-Disposition": `attachment; filename=invoice-${client._id}.pdf`,
		"Content-Length": pdfBuffer.length,
	});

	res.send(pdfBuffer);
});

// ✅ AJAX Search Route
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    const regex = new RegExp(query, "i");

    const clients = await Client.find({
      $or: [
        { company_en: regex },
        { registered_owner_name_en: regex },
        { mobile: regex }
      ]
    }).limit(30); // حد أقصى عشان الأداء

    res.render("partials/clientTableRows", { clients, currentPage: 1 });
  } catch (err) {
    console.error("❌ Error in AJAX search:", err);
    res.status(500).send("Server Error");
  }
});

router.get("/api/search", async (req, res) => {
  try {
    const searchQuery = req.query.q || "";
    const regex = new RegExp(searchQuery, "i");

    const clients = await Client.find({
      $or: [
        { company_en: regex },
        { registered_owner_name_en: regex },
        { mobile: regex },
      ],
    }).limit(20); // limit للسرعة

    res.json(clients);
  } catch (err) {
    console.error("❌ Error in AJAX search:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
