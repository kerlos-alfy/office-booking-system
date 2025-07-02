const express = require("express");
const router = express.Router();
const Branch = require("../models/Branch");
const Office = require("../models/Office");
const Booking = require("../models/Booking");

// ✅ عرض كل الفروع
router.get("/branches", async (req, res) => {
  const branches = await Branch.find().lean(); // 👈 هنا الحل
  console.log(branches);
  res.render("explore/branches", { branches });
});



// ✅ عرض التصنيفات داخل فرع معين
router.get("/branches/:branchId/sizes", async (req, res) => {
	const branch = await Branch.findById(req.params.branchId);
	res.render("explore/sizes", { branch });
});

// ✅ عرض المكاتب داخل تصنيف معين (size_category)
router.get("/branches/:branchId/offices", async (req, res) => {
  try {
    const { branchId } = req.params;
    const { size_category } = req.query;

    // نجيب المكاتب المتاحة فقط بناءً على التصنيف
    const offices = await Office.find({
      branch_id: branchId,
      size_category: size_category,
      status: "available",
    });

    const branch = await Branch.findById(branchId);

    res.render("explore/offices", {
      offices,
      branch,
      size_category,
      sizeLabel: size_category.replace("-", " - ") + " sqft",
    });
  } catch (err) {
    console.error("❌ Error loading offices:", err);
    res.status(500).send("Error loading offices");
  }
});

// ✅ عرض تفاصيل مكتب معين
router.get("/offices/:officeId", async (req, res) => {
  try {
    const office = await Office.findById(req.params.officeId).populate("branch_id");

    if (!office) {
      return res.status(404).send("Office not found");
    }

    const isBooked = await Booking.exists({ office_id: office._id });

    res.render("explore/officeDetails", {
      office,
      isBooked,
    });
  } catch (err) {
    console.error("❌ Error loading office details:", err.message);
    res.status(500).send("Error loading office details");
  }
});
  

// 🖼️ صفحة تفاصيل المكتب
router.get("/:officeId", async (req, res) => {
  try {
    const office = await Office.findById(req.params.officeId).populate("branch_id");
    if (!office) return res.status(404).send("Office not found");

    // ✅ تحقق إذا المكتب محجوز
    const booking = await Booking.findOne({
      office_id: office._id,
      status: "active",
      end_date: { $gte: new Date() },
    });

    const isBooked = !!booking;

    // ✅ إرسال isBooked للعرض
    res.render("explore/officeDetails", { office, isBooked });
  } catch (err) {
    console.error("Error loading office details", err);
    res.status(500).send("Error loading office details");
  }
});

router.get("/", async (req, res) => {
  res.render("explore/home");
});




module.exports = router;
