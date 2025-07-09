const express = require('express');
const router = express.Router();
const Office = require('../models/Office');
const Branch = require('../models/Branch');
const { authenticateJWT } = require('../middlewares/auth');

// ✅ عرض كل المكاتب
router.get('/manage', authenticateJWT, async (req, res) => {
  const branches = await Branch.find();
  const { branch_id, floor } = req.query;

  let query = {};
  if (branch_id) query.branch_id = branch_id;
  if (floor) query.floor = floor;

  if (req.user.branch != null) {
    query.branch_id = req.user.branch;
  }

  const offices = await Office.find(query).populate('branch_id');

  // ✅ جلب جميع الأدوار الخاصة بالفرع المختار
  let floors = [];
  if (branch_id) {
    const branchOffices = await Office.find({ branch_id: branch_id });
    floors = [...new Set(branchOffices.map(o => o.floor).filter(Boolean))].sort();
  }

  res.render('admin/offices/index', {
    offices,
    branches,
    floors,
    selectedBranch: branch_id || '',
    selectedFloor: floor || ''
  });
});
router.get('/api/floors/:branchId', authenticateJWT, async (req, res) => {
  const branchId = req.params.branchId;
  const branchOffices = await Office.find({ branch_id: branchId });

  const floors = [...new Set(branchOffices.map(o => o.floor).filter(Boolean))].sort();

  res.json(floors);
});


// ✅ عرض فورم إضافة مكتب
router.get('/manage/new', authenticateJWT, async (req, res) => {
  const branches = await Branch.find();
  res.render('admin/offices/new', { branches });
});

// ✅ حفظ مكتب جديد
router.post('/manage', authenticateJWT, async (req, res) => {
  const { office_number, branch_id, floor, size_category } = req.body;

  await Office.create({
    office_number,
    branch_id,
    floor,
    size_category
  });

  res.redirect('/offices/manage');
});

// ✅ عرض فورم تعديل مكتب
router.get('/manage/:id/edit', authenticateJWT, async (req, res) => {
  const office = await Office.findById(req.params.id);
  const branches = await Branch.find();
  if (!office) return res.redirect('/offices/manage');
  res.render('admin/offices/edit', { office, branches });
});

// ✅ حفظ التعديل
const multer = require('multer');
const upload = multer();

router.post('/manage/:id', authenticateJWT, upload.none(), async (req, res) => {
  console.log('BODY:', req.body);

  const {
    office_number,
    branch_id,
    floor,
    size_category,
    // ولو فيه payment_plans:
    payment_plans_json
  } = req.body;

  const payment_plans = payment_plans_json ? JSON.parse(payment_plans_json) : [];

  await Office.findByIdAndUpdate(req.params.id, {
    office_number,
    branch_id,
    floor,
    size_category,
    payment_plans
  });

  res.redirect('/offices/manage');
});

// ✅ حذف مكتب
router.post('/manage/:id/delete', authenticateJWT, async (req, res) => {
  await Office.findByIdAndDelete(req.params.id);
  res.redirect('/offices/manage');
});

module.exports = router;
