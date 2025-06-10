const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Office = require('../models/Office');
const Client = require('../models/Client');

// ✅ صفحة عامة تعرض اخر 20 دفعة
router.get('/', async (req, res) => {
    try {
        const latestPayments = await Booking.aggregate([
            { $unwind: "$payments" },
            { $sort: { "payments.payment_date": -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: "clients",
                    localField: "client_id",
                    foreignField: "_id",
                    as: "client"
                }
            },
            {
                $lookup: {
                    from: "offices",
                    localField: "office_id",
                    foreignField: "_id",
                    as: "office"
                }
            }
        ]);

        res.render('latestPayments', { latestPayments });
    } catch (err) {
        res.status(500).send('Error loading latest payments');
    }
});

// ✅ صفحة عرض دفعات Booking معين
router.get('/booking/:bookingId', async (req, res) => {
    try {
        const bookingId = req.params.bookingId;

        const booking = await Booking.findById(bookingId)
            .populate('office_id')
            .populate('client_id');

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        res.render('bookingPayments', { booking });
    } catch (err) {
        res.status(500).send('Error loading booking payments');
    }
});

// ✅ اضافة دفعة جديدة
router.post('/booking/:bookingId/payments', async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const { amount, payment_type } = req.body;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        booking.payments.push({
            amount,
            payment_date: new Date(),
            payment_type
        });

        await booking.save();

        res.redirect(`/payments/booking/${bookingId}`);
    } catch (err) {
        res.status(500).send('Error adding payment');
    }
});

module.exports = router;
