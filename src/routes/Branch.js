// src/routes/branches.js
const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');

// عرض كل الفروع
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find();
        res.render('branches', { branches });
    } catch (err) {
        res.status(500).send('Error loading branches');
    }
});

// صفحة إضافة فرع جديد (Form)
router.get('/new', (req, res) => {
    res.render('newBranch');
});

// حفظ فرع جديد
router.post('/new', async (req, res) => {
    try {
        const branch = new Branch({
            name: req.body.name,
            location: req.body.location
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
