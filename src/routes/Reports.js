const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Office = require('../models/Office');

// ✅ Revenue Report
router.get('/revenue', async (req, res) => {
    try {
        const selectedMonth = req.query.month;
        const selectedBranchIds = req.query.branch_ids
            ? Array.isArray(req.query.branch_ids)
                ? req.query.branch_ids
                : [req.query.branch_ids]
            : [];

        const branches = await Branch.find();

        // لو مفيش Month → رجع الفيو بس
        if (!selectedMonth) {
            return res.render('revenueReport', {
                selectedMonth: '',
                selectedBranchIds,
                branches,
                reportData: [],
                totalExpectedRevenue: 0,
                totalPaid: 0,
                collectionRate: 0
            });
        }

        // Filter bookings by Month
        const startDate = new Date(selectedMonth + '-01');
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        // Filter branch if selected
        let officeFilter = {};
        if (selectedBranchIds.length > 0) {
            const officesInBranches = await Office.find({
                branch_id: { $in: selectedBranchIds }
            }).distinct('_id');

            officeFilter = {
                office_id: { $in: officesInBranches }
            };
        }

        // Get relevant bookings
        const bookings = await Booking.find({
            ...officeFilter,
            start_date: { $lt: endDate },
            end_date: { $gte: startDate }
        }).populate('office_id').populate('client_id');

        // Build report
        let reportData = [];
        let totalExpectedRevenue = 0;
        let totalPaid = 0;

        bookings.forEach(booking => {
            const paidSoFar = booking.payments.reduce((sum, p) => sum + p.amount, 0);

            reportData.push({
                office: booking.office_id?.office_number || 'N/A',
                client: booking.client_id?.name || 'N/A',
                contract_type: booking.contract_type || '-',
                expected_revenue: booking.total_price,
                paid_so_far: paidSoFar,
                remaining: booking.total_price - paidSoFar
            });

            totalExpectedRevenue += booking.total_price;
            totalPaid += paidSoFar;
        });

        const collectionRate = totalExpectedRevenue === 0 ? 0 : (totalPaid / totalExpectedRevenue) * 100;

        res.render('revenueReport', {
            selectedMonth,
            selectedBranchIds,
            branches,
            reportData,
            totalExpectedRevenue,
            totalPaid,
            collectionRate
        });

    } catch (err) {
        res.status(500).send('Error loading revenue report');
    }
});

module.exports = router;
