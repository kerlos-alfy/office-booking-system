// src/routes/branches.js
const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// عرض كل الفروع
// GET /branches
router.get('/',
  authenticateJWT,
  hasPermission('branches.view'),
  async (req, res) => {
    try {
      let query = {};

      if (req.user.branch) {
        query._id = req.user.branch;
      }

      const branches = await Branch.find(query);

      console.log('✅ Branches from DB:', JSON.stringify(branches, null, 2)); // Debug

      res.render('branches', { branches, user: req.user });

    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading branches');
    }
  }
);


// صفحة إضافة فرع جديد (Form)
router.get('/new',authenticateJWT, (req, res) => {
  res.render('newBranch', {
    user: req.user  // ✅ كده ال header هيلاقي ال user
  });
});


// حفظ فرع جديد
router.post('/new', async (req, res) => {
  try {
    const branch = new Branch({
      name: req.body.name_en,
      name_ar: req.body.name_ar,
      location: req.body.location,
      whatsapp_number: req.body.whatsapp_number
    });

    await branch.save();
    res.redirect('/branches');
  } catch (err) {
    res.status(500).send('Error saving branch');
  }
});

// ✅ View Branch Details
router.get('/view/:branchId', async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.branchId);

        if (!branch) {
            return res.status(404).send('Branch not found');
        }

        res.render('branchView', { branch });
    } catch (err) {
        res.status(500).send('Error loading branch');
    }
});

module.exports = router;
