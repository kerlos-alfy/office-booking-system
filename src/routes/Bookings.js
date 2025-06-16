const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Office = require('../models/Office');
const Client = require('../models/Client');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
// ✅ الصفحة الرئيسية — عرض الفروع
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
        }).populate('client_id');

        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const activeBookings = bookings.filter(b => b.status === 'active' && new Date(b.end_date) >= today);

        const bookedOfficeIds = activeBookings.map(b => b.office_id.toString());

        // Stats:
        const totalOffices = offices.length;
        const totalBooked = activeBookings.length;
        const totalAvailable = totalOffices - totalBooked;

        const expiringThisMonth = activeBookings.filter(b =>
            new Date(b.end_date) >= today && new Date(b.end_date) <= endOfMonth
        ).length;

        res.render('bookingOffices', {
            offices,
            branchId,
            bookedOfficeIds,
            bookings: activeBookings,
            filter: req.query.filter || 'all',
            totalOffices,
            totalBooked,
            totalAvailable,
            expiringThisMonth
        });

    } catch (err) {
        res.status(500).send('Error loading offices');
    }
});

// ✅ Form New Booking
router.get('/new/:officeId', async (req, res) => {
    try {
        const office = await Office.findById(req.params.officeId).populate('branch_id');
        const clients = await Client.find();
        res.render('bookingNew', { office, clients });
    } catch (err) {
        res.status(500).send('Error loading new booking form');
    }
});

// ✅ POST — New Booking
router.post('/', async (req, res) => {
    try {
        console.log('✅ req.body:', req.body);

        const {
            office_id,
            client_id,
            page_no,
            start_date,
            end_date,
            down_payment,
            cheques_count,
            cheques,
            total_price,
            vat,
            sec_deposit,
            admin_fee,
            commission,
            ejari
        } = req.body;

        const chequesArray = cheques ? Object.values(cheques) : [];

        const booking = new Booking({
            office_id,
            client_id,
            page_no,
            start_date,
            end_date,
            initial_payment: down_payment,
            total_price,
            vat,
            sec_deposit,
            admin_fee,
            commission,
            ejari_no: ejari,
            payments: [
                {
                    amount: down_payment,
                    payment_date: new Date(),
                    payment_type: 'initial'
                }
            ],
            cheques: chequesArray
        });

        await booking.save();
        console.log('✅ Booking created:', booking);

        // ✅ Generate contract automatically
        const fullBooking = await Booking.findById(booking._id)
            .populate('office_id')
            .populate('client_id');

        const templatePath = path.join(__dirname, '../templates/Office_Contract_Template.docx');
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);

        doc.setData({
            client_name: fullBooking.client_id?.registered_owner_name || '',
            company_name: fullBooking.client_id?.company || '',
            office_number: fullBooking.office_id?.office_number || '',
            branch_name: fullBooking.office_id?.branch_id?.name || '',
            start_date: fullBooking.start_date.toISOString().split('T')[0],
            end_date: fullBooking.end_date.toISOString().split('T')[0],
            total_price: fullBooking.total_price,
            ejari_no: fullBooking.ejari_no,
            page_no: fullBooking.page_no
        });

        doc.render();
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        const contractsDir = path.join(__dirname, '../contracts');
        if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir);
        const filename = `Contract_${booking._id}.docx`;
        const filepath = path.join(contractsDir, filename);
        fs.writeFileSync(filepath, buf);
        console.log(`✅ Contract generated: ${filename}`);

        res.redirect('/bookings/success');
    } catch (err) {
        console.error('❌ Error creating booking:', err);
        res.status(500).send('Error creating booking');
    }
});

// ✅ View Booking Details
router.get('/view/:bookingId', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId)
            .populate('office_id')
            .populate('client_id');

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        res.render('bookingView', { booking });
    } catch (err) {
        res.status(500).send('Error loading booking view');
    }
});

// ✅ Archive Page → Show archived bookings
router.get('/archive', async (req, res) => {
    try {
        const clientFilter = req.query.client;

        let query = { status: 'archived' };

        if (clientFilter) {
            query = {
                ...query,
                client_id: {
                    $in: await Client.find({
                        name: { $regex: clientFilter, $options: 'i' }
                    }).distinct('_id')
                }
            };
        }

        const archivedBookings = await Booking.find(query)
            .populate('office_id')
            .populate('client_id');

        res.render('bookingArchive', { archivedBookings, client: clientFilter });

    } catch (err) {
        res.status(500).send('Error loading archive');
    }
});

// ✅ Release Office → Archive Booking
router.post('/:bookingId/archive', async (req, res) => {
    try {
        await Booking.findByIdAndUpdate(req.params.bookingId, { status: 'archived' });
        console.log(`✅ Booking ${req.params.bookingId} archived.`);
        res.redirect('/bookings/success');
    } catch (err) {
        res.status(500).send('Error archiving booking');
    }
});

// ✅ Toggle Collected Status for Cheque
router.post('/:bookingId/cheques/:chequeIndex/toggle-collected', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        const chequeIndex = parseInt(req.params.chequeIndex);

        if (!booking || !booking.cheques[chequeIndex]) {
            return res.status(404).send('Cheque not found');
        }

        // Toggle collected
        booking.cheques[chequeIndex].collected = !booking.cheques[chequeIndex].collected;

        await booking.save();

        console.log(`✅ Cheque #${chequeIndex + 1} in booking ${booking._id} marked as ${booking.cheques[chequeIndex].collected ? 'Collected' : 'Uncollected'}`);

        res.redirect(`/bookings/view/${booking._id}`);
    } catch (err) {
        console.error('❌ Error toggling cheque collected:', err);
        res.status(500).send('Error toggling cheque collected');
    }
});

// ✅ Success Page
router.get('/success', (req, res) => {
    res.render('bookingSuccess');
});



router.get('/:bookingId/generate-contract', async (req, res) => {
    try {
        console.log('🔁 Generating PDF contract for booking:', req.params.bookingId);

        const booking = await Booking.findById(req.params.bookingId)
            .populate('office_id')
            .populate({
                path: 'office_id',
                populate: { path: 'branch_id' }
            })
            .populate('client_id');

        if (!booking) return res.status(404).send('Booking not found');

        // 📄 مسار القالب
        const templatePath = path.join(__dirname, '../templates/contractTemplate.ejs');

        const html = await ejs.renderFile(templatePath, {
            tenant_name: booking.client_id?.registered_owner_name || '',
            license_no: booking.client_id?.license_no || '',
            email: booking.client_id?.email || '',
            phone: booking.client_id?.phone || '',
            license_expiry: booking.client_id?.license_expiry
                ? booking.client_id.license_expiry.toISOString().split('T')[0]
                : '',
            unit_number: booking.office_id?.office_number || '',
            ejari: booking.ejari_no || '0',
            vat: booking.vat || '0',
            commission: booking.commission || '0',
            office_rent: booking.total_price - (booking.vat || 0) - (booking.commission || 0),
            total_price: booking.total_price || 0,
            start_date: booking.start_date.toISOString().split('T')[0],
            end_date: booking.end_date.toISOString().split('T')[0],
            cheques: booking.cheques.map((chq) => ({
                date: new Date(chq.date).toISOString().split('T')[0],
                amount: chq.amount
            }))
        });

        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });

        await browser.close();

        const filename = `Tenancy_Contract_${booking._id}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`
        });

        res.send(pdfBuffer);

    } catch (err) {
        console.error('❌ Error generating PDF contract:', err.message);
        res.status(500).send('Error generating contract');
    }
});

module.exports = router;
