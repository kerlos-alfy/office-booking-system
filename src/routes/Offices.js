const express = require('express');
const router = express.Router();
const Office = require('../models/Office');
const Branch = require('../models/Branch');
const Booking = require('../models/Booking'); // ✅ لازم نجيب Booking عشان نعرف المحجوز

// عرض كل المكاتب
router.get('/', async (req, res) => {
    try {
        const offices = await Office.find().populate('branch_id');

        // ✅ نحسب المكاتب المحجوزة
        const activeBookings = await Booking.find({
            status: 'active',
            end_date: { $gte: new Date() }
        });

        const bookedOfficeIds = activeBookings.map(b => b.office_id.toString());

        res.render('offices', {
            offices,
            bookedOfficeIds
        });

    } catch (err) {
        res.status(500).send('Error loading offices');
    }
});

// Form: إضافة مكتب
router.get('/new', async (req, res) => {
    const branches = await Branch.find();
    res.render('newOffice', { branches });
});

// Save new office
router.post('/new', async (req, res) => {
    try {
        const office = new Office({
            branch_id: req.body.branch_id,
            office_number: req.body.office_number,
            monthly_price: req.body.monthly_price,
            yearly_price: req.body.yearly_price,
            floor: req.body.floor // لو حابب تخزن floor كمان
        });
        await office.save();
        res.redirect('/offices');
    } catch (err) {
        res.status(500).send('Error saving office');
    }
});

module.exports = router;
