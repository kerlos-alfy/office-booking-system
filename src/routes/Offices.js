const express = require('express');
const router = express.Router();
const Office = require('../models/Office');
const Branch = require('../models/Branch');
const Booking = require('../models/Booking'); // ✅ لازم نجيب Booking عشان نعرف المحجوز
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater')
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

router.get('/:officeId/booking-contract', async (req, res) => {
    const office = await Office.findById(req.params.officeId);
    const booking = await Booking.findOne({ office_id: office._id }).populate('client_id');

    if (!booking || !booking.client_id) return res.status(404).send('Booking not found');

    const client = booking.client_id;

    const templatePath = path.join(__dirname, '../templates/contract-template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip);

    doc.setData({
        tenant_name: client.registered_owner_name,
        company: client.company,
        mobile: client.mobile,
        start_date: booking.start_date.toISOString().split('T')[0],
        end_date: booking.end_date.toISOString().split('T')[0],
        total_price: booking.total_price,
        vat: booking.vat,
        office_number: office.name,
        ejari_no: booking.ejari_no || '---'
    });

    doc.render();
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Contract-${office.name}.docx"`
    });

    res.send(buffer);
});


module.exports = router;
