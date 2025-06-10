const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Office = require('../models/Office');
const Client = require('../models/Client');

// ✅ الصفحة الرئيسية — عرض الفروع (4 بلوك)
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find();
        res.render('bookingBranches', { branches });
    } catch (err) {
        res.status(500).send('Error loading branches');
    }
});

// ✅ Offices per Branch
router.get('/branch/:branchId', async (req, res) => {
    try {
        const branchId = req.params.branchId;

        const offices = await Office.find({ branch_id: branchId });

        const bookings = await Booking.find({
            office_id: { $in: offices.map(o => o._id) }
        }).populate('client_id'); // لازم نعمل populate للعميل عشان نجيب اسمه

        const bookedOfficeIds = bookings.map(b => b.office_id.toString());

        res.render('bookingOffices', {
            offices,
            branchId,
            bookedOfficeIds,
            bookings // ✅ دي لازم تكون موجودة
        });
    } catch (err) {
        res.status(500).send('Error loading offices');
    }
});


// ✅ صفحة تفاصيل الحجز لمكتب معين
router.get('/branch/:branchId/office/:officeId', async (req, res) => {
    try {
        const officeId = req.params.officeId;

        const clients = await Client.find();
        const office = await Office.findById(officeId).populate('branch_id');

        res.render('bookingForm', { office, clients });
    } catch (err) {
        res.status(500).send('Error loading booking form');
    }
});

// ✅ حفظ الحجز
router.post('/branch/:branchId/office/:officeId', async (req, res) => {
    try {
        const booking = new Booking({
            office_id: req.params.officeId,
            client_id: req.body.client_id,
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            contract_type: req.body.contract_type,
            initial_payment: req.body.initial_payment,
            total_price: req.body.total_price,
            payments: [
                {
                    amount: req.body.initial_payment,
                    payment_date: new Date(),
                    payment_type: 'initial'
                }
            ]
        });

        await booking.save();
        res.redirect('/bookings');
    } catch (err) {
        res.status(500).send('Error saving booking');
    }
});

module.exports = router;
