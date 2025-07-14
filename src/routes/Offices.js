// 📁 routes/offices.js
const express = require("express");
const router = express.Router();
const Office = require("../models/Office");
const Branch = require("../models/Branch");
const Booking = require("../models/Booking");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { authenticateJWT, hasPermission } = require('../middlewares/auth');

const tempUploadPath = path.join(__dirname, "../../public/uploads/offices/temp");
fs.mkdirSync(tempUploadPath, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeName = baseName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, Date.now() + "-" + safeName + ext);
  },
});
const upload = multer({ storage });

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
      query: req.query // ✅ أضف دي
    });
  } catch (err) {
    console.error("Error loading offices", err);
    res.status(500).send("Error loading offices");
  }
});

router.get("/new", async (req, res) => {
  const branches = await Branch.find();
  res.render("newOffice", { branches });
});

router.post("/new", upload.fields([
  { name: "main_image", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]), async (req, res) => {
  try {
    const {
      office_number,
      branch_id,
     
      floor,
      size_category,
      payment_plans_json
    } = req.body;

    const payment_plans = payment_plans_json ? JSON.parse(payment_plans_json) : [];

    const officeNumberClean = office_number.replace(/\s+/g, "");
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 12);
    const folderName = `office_${officeNumberClean}_${timestamp}`;
    const folderPath = path.join(__dirname, "../../public/uploads/offices", folderName);
    fs.mkdirSync(folderPath, { recursive: true });

    const mainImage = req.files["main_image"]?.[0];
    const galleryImages = req.files["gallery"] || [];

    let mainImagePath = "";
    if (mainImage) {
      const targetPath = path.join(folderPath, mainImage.filename);
      fs.renameSync(mainImage.path, targetPath);
      mainImagePath = path.posix.join("uploads/offices", folderName, mainImage.filename);
    }

    const galleryPaths = [];
    for (const file of galleryImages) {
      const targetPath = path.join(folderPath, file.filename);
      fs.renameSync(file.path, targetPath);
      galleryPaths.push(path.posix.join("uploads/offices", folderName, file.filename));
    }

    const newOffice = await Office.create({
      office_number,
      branch_id,
      
      floor,
      size_category,
      status: "available",
      main_image: mainImagePath,
      gallery: galleryPaths,
      image_folder: path.posix.join("uploads/offices", folderName),
      payment_plans
    });

    res.redirect("/offices");
  } catch (err) {
    console.error("❌ Error saving office", err);
    res.status(500).send("Error saving office");
  }
});

router.get('/:id/edit', async (req, res) => {
  const office = await Office.findById(req.params.id).populate("branch_id");
  const branches = await Branch.find();
  if (!office) return res.status(404).send("Office not found");

  const allImages = office.gallery.includes(office.main_image)
    ? [...office.gallery]
    : [office.main_image, ...office.gallery];

  res.render("editOffice", { office, branches, allImages });
});

router.post('/:id/edit', upload.array("new_images", 10), async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    if (!office) return res.status(404).send("Office not found");

    const {
      office_number,
      branch_id,
     
      floor,
      size_category,
      main_image,
      sorted_gallery = [],
      delete_images = [],
      payment_plans_json,
    } = req.body;

    const deleteArr = Array.isArray(delete_images) ? delete_images : [delete_images];
    deleteArr.forEach(img => {
      office.gallery = office.gallery.filter(existing => existing !== img);
      if (img === office.main_image) office.main_image = null;
      const fullPath = path.join(__dirname, "../../public", img);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    const folderPath = path.join(__dirname, "../../public", office.image_folder);
    fs.mkdirSync(folderPath, { recursive: true });

    req.files.forEach(file => {
      const targetPath = path.join(folderPath, file.originalname);
      fs.renameSync(file.path, targetPath);
      const relativePath = path.posix.join(office.image_folder, file.originalname);
      office.gallery.push(relativePath);
    });

    const sortArr = Array.isArray(sorted_gallery) ? sorted_gallery : [sorted_gallery];
    const filteredSorted = sortArr.filter(img => office.gallery.includes(img));
    const extra = office.gallery.filter(img => !filteredSorted.includes(img));
    office.gallery = [...filteredSorted, ...extra];

    if (main_image) office.main_image = main_image;

    office.office_number = office_number;
    office.branch_id = branch_id;
  
    office.floor = floor;
    office.size_category = size_category;

    try {
      office.payment_plans = payment_plans_json ? JSON.parse(payment_plans_json) : [];
    } catch (e) {
      console.error("Error parsing payment plans", e);
    }

    await office.save();
    res.redirect("/offices");
  } catch (err) {
    console.error("❌ Error updating office:", err);
    res.status(500).send("Error updating office");
  }
});

// routes/offices.js
// عرض صفحة Manage Offices
router.get('/manage/list',
  authenticateJWT,
  hasPermission('manage_offices'),
  async (req, res) => {
    let { branch_id, floor } = req.query;

    if (req.user.branch) {
      // يجمد الفرع على فرعه
      branch_id = req.user.branch;
    }

    let query = {};
    if (branch_id) query.branch_id = branch_id;
    if (floor) query.floor = floor;

    const offices = await Office.find(query).populate('branch_id');
    res.json(offices);
  }
);

router.get('/manage',
  authenticateJWT,
  hasPermission('manage_offices'),
  async (req, res) => {
    const officeQuery = req.user.branch
      ? { branch_id: req.user.branch }
      : {};

    const offices = await Office.find(officeQuery).populate('branch_id');

    const branches = req.user.branch
      ? await Branch.find({ _id: req.user.branch })
      : await Branch.find({});

    res.render('manageOffices', {
      offices,
      branches,
      user: req.user
    });
  }
);

router.get('/manage/list',
  authenticateJWT,
  hasPermission('manage_offices'),
  async (req, res) => {
    let { branch_id, floor } = req.query;

    if (req.user.branch) {
      branch_id = req.user.branch;
    }

    let query = {};
    if (branch_id) query.branch_id = branch_id;
    if (floor) query.floor = floor;

    const offices = await Office.find(query).populate('branch_id');
    res.json(offices);
  }
);

router.get('/branches/:id/floors',
  authenticateJWT,
  hasPermission('manage_offices'),
  async (req, res) => {
    let branchId = req.params.id;

    if (req.user.branch) {
      branchId = req.user.branch;
    }

    const offices = await Office.find({ branch_id: branchId });

    const floors = [...new Set(offices.map(o => o.floor))].sort((a, b) => a - b);

    res.json(floors);
  }
);


router.delete('/:id', async (req, res) => {
  try {
    await Office.findByIdAndDelete(req.params.id);
    res.redirect('/offices?success=Office deleted successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting office');
  }
});



router.get('/bulk-price', async (req, res) => {
  const branches = await Branch.find();
  res.render('bulkPriceUpdate', { branches });
});


router.get('/branch/:branchId/offices', async (req, res) => {
  try {
    const offices = await Office.find({ branch_id: req.params.branchId });
    res.json(offices);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching offices');
  }
});

// ✅ API يرجع الفروع كلها
router.get('/api/branches', async (req, res) => {
  try {
    const branches = await Branch.find().select('_id name');
    res.json(branches);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching branches');
  }
});



router.post('/bulk-update-price', async (req, res) => {
  const { officeIds, increaseAmount } = req.body;

  try {
    const offices = await Office.find({ _id: { $in: officeIds } });

    for (const office of offices) {
      office.payment_plans = office.payment_plans.map(plan => ({
        ...plan.toObject(),
        total_price: plan.total_price + parseFloat(increaseAmount)
      }));
      await office.save();
    }

    res.send('✅ Prices updated successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Error updating prices');
  }
});


module.exports = router;
