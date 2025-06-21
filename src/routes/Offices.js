const express = require("express");
const router = express.Router();
const Office = require("../models/Office");
const Branch = require("../models/Branch");
const Booking = require("../models/Booking");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../public/uploads/offices");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeName = baseName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, Date.now() + "-" + safeName + ext);
  },
});
const upload = multer({ storage });

// 🏢 عرض كل المكاتب
router.get("/", async (req, res) => {
  try {
    let offices = await Office.find().populate("branch_id");

    offices = offices.sort((a, b) => {
      const aNum = parseInt(a.office_number.replace(/\D/g, "")) || 0;
      const bNum = parseInt(b.office_number.replace(/\D/g, "")) || 0;
      return aNum - bNum;
    });

    const activeBookings = await Booking.find({
      status: "active",
      end_date: { $gte: new Date() },
    });

    const bookedOfficeIds = activeBookings.map((b) => b.office_id.toString());

    res.render("offices", {
      offices,
      bookedOfficeIds,
    });
  } catch (err) {
    console.error("Error loading offices", err);
    res.status(500).send("Error loading offices");
  }
});

// ➕ صفحة الإضافة
router.get("/new", async (req, res) => {
  const branches = await Branch.find();
  res.render("newOffice", { branches });
});

// ✅ حفظ مكتب جديد
router.post(
  "/new",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      console.log("🖼️ Uploaded Files:", req.files);
      const {
        office_number,
        branch_id,
        monthly_price,
        yearly_price,
        floor,
        size_category,
      } = req.body;

      const mainImage = req.files["main_image"]?.[0]?.filename;
      const galleryImages = req.files["gallery"]?.map(f => f.filename) || [];

      const newOffice = await Office.create({
        office_number,
        branch_id,
        monthly_price,
        yearly_price,
        floor,
        size_category,
        status: "available",
        main_image: mainImage ? `/uploads/offices/${mainImage}` : "",
        gallery: galleryImages.map(name => `/uploads/offices/${name}`),
      });

      console.log("✅ New office saved:", newOffice);
      res.redirect("/offices");
    } catch (err) {
      console.error("❌ Error saving office", err);
      res.status(500).send("Error saving office");
    }
  }
);

// 📄 عقد الحجز بناءً على المكتب
router.get("/:officeId/booking-contract", async (req, res) => {
  const office = await Office.findById(req.params.officeId);
  const booking = await Booking.findOne({ office_id: office._id }).populate("client_id");

  if (!booking || !booking.client_id) return res.status(404).send("Booking not found");

  const client = booking.client_id;

  const templatePath = path.join(__dirname, "../templates/contract-template.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip);

  doc.setData({
    tenant_name: client.registered_owner_name,
    company: client.company,
    mobile: client.mobile,
    start_date: booking.start_date.toISOString().split("T")[0],
    end_date: booking.end_date.toISOString().split("T")[0],
    total_price: booking.total_price,
    vat: booking.vat,
    office_number: office.office_number,
    ejari_no: booking.ejari_no || "---",
  });

  doc.render();
  const buffer = doc.getZip().generate({ type: "nodebuffer" });

  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="Contract-${office.office_number}.docx"`,
  });

  res.send(buffer);
});

// 🖼️ صفحة تفاصيل المكتب
router.get("/:officeId", async (req, res) => {
  try {
    const office = await Office.findById(req.params.officeId).populate("branch_id");
    if (!office) return res.status(404).send("Office not found");
    console.log("📷 Main Image Path:", office.main_image);
    res.render("explore/officeDetails", { office });
  } catch (err) {
    console.error("Error loading office details", err);
    res.status(500).send("Error loading office details");
  }
});

module.exports = router;
