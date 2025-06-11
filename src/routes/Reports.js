const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Office = require('../models/Office');
const Client = require('../models/Client');

// Revenue Report
router.get('/revenue', async (req, res) => {
    try {
        const monthParam = req.query.month; // Format: YYYY-MM
        let reportData = [];
        let totalExpectedRevenue = 0;
        let totalPaid = 0;
        let collectionRate = 0;

        if (monthParam) {
            const [year, month] = monthParam.split('-').map(Number);

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const bookings = await Booking.find({
                start_date: { $lte: endDate },
                end_date: { $gte: startDate }
            })
            .populate('office_id')
            .populate('client_id');

            reportData = bookings.map(booking => {
                const totalPaidForBooking = booking.payments.reduce((sum, p) => sum + p.amount, 0);
                const remaining = booking.total_price - totalPaidForBooking;

                // اجمع للقيم الإجمالية
                totalExpectedRevenue += booking.total_price;
                totalPaid += totalPaidForBooking;

                return {
                    office: booking.office_id ? booking.office_id.office_number : 'N/A',
                    client: booking.client_id ? booking.client_id.name : 'N/A',
                    contract_type: booking.contract_type,
                    expected_revenue: booking.total_price,
                    paid_so_far: totalPaidForBooking,
                    remaining
                };
            });

            // حساب نسبة التحصيل
            if (totalExpectedRevenue > 0) {
                collectionRate = (totalPaid / totalExpectedRevenue) * 100;
            }
        }

        res.render('revenueReport', {
            reportData,
            selectedMonth: monthParam || '',
            totalExpectedRevenue,
            totalPaid,
            collectionRate
        });
    } catch (err) {
        res.status(500).send('Error loading revenue report');
    }
});

router.get('/timeline', async (req, res) => {
    try {
        const range = req.query.range || '3months';
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const now = new Date();
        let startDate, endDate;

        if (range === 'custom' && startMonth && endMonth) {
            const [startY, startM] = startMonth.split('-').map(Number);
            const [endY, endM] = endMonth.split('-').map(Number);

            startDate = new Date(startY, startM - 1, 1);
            endDate = new Date(endY, endM, 0, 23, 59, 59);
        } else {
            let monthsBack = 3;
            if (range === '6months') monthsBack = 6;
            if (range === '12months') monthsBack = 12;

            startDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        const dataPoints = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
            const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: 'numeric' });

            const bookings = await Booking.find({
                start_date: { $lte: monthEnd },
                end_date: { $gte: monthStart }
            });

            const total = bookings.reduce((sum, b) => sum + b.total_price, 0);
            const paid = bookings.reduce((sum, b) => {
                return sum + b.payments.reduce((s, p) => s + p.amount, 0);
            }, 0);

            dataPoints.push({
                label: monthLabel,
                expected: total,
                paid
            });

            current.setMonth(current.getMonth() + 1);
        }

        res.render('revenueTimeline', {
            dataPoints,
            range,
            startMonth,
            endMonth
        });
    } catch (err) {
        res.status(500).send('Error loading timeline report');
    }
});

    
module.exports = router;
