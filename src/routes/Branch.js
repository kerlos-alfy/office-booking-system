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

module.exports = router;
