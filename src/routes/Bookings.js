const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Office = require('../models/Office');
const Client = require('../models/Client');

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
        res.render('bookingNew', { office });
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

module.exports = router;
