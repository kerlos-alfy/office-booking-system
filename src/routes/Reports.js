const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Office = require('../models/Office');

// ✅ Revenue Report: initial_payment + Cheques + Overdue + Debug\
// ✅ Revenue Report Route
/* ==============================================
   ✅ Revenue Report Route: Down Payment + Cheques
   ============================================== */
router.get('/revenue', async (req, res) => {
  try {
    // 🟢 1) Get month & year
    let selectedMonth = parseInt(req.query.month);
    const selectedYear = parseInt(req.query.year);
    const selectedBranchIds = req.query.branch_ids
      ? Array.isArray(req.query.branch_ids)
        ? req.query.branch_ids
        : [req.query.branch_ids]
      : [];

    // 🟢 Ensure month index 0-11
    if (selectedMonth > 11) {
      selectedMonth = selectedMonth - 1;
    }

    const branches = await Branch.find();

    if (isNaN(selectedMonth) || isNaN(selectedYear)) {
      return res.render('revenueReport', {
        selectedMonth: '',
        selectedYear: '',
        selectedBranchIds,
        branches,
        reportData: [],
        totalDownPayments: 0,
        totalChequesAmount: 0,
        totalExpectedRevenue: 0,
        totalPaid: 0,
        collectionRate: 0,
      });
    }

    // 🟢 2) Define range with Date.UTC
    const startDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
    const endDate = new Date(Date.UTC(selectedYear, selectedMonth + 1, 1));

    console.log('🟢 Selected:', selectedMonth, selectedYear);
    console.log('✅ Start Date ISO:', startDate.toISOString());
    console.log('✅ End Date ISO:', endDate.toISOString());

    // 🟢 3) Filter offices by branch if needed
    let officeFilter = {};
    if (selectedBranchIds.length > 0) {
      const officesInBranches = await Office.find({
        branch_id: { $in: selectedBranchIds },
      }).distinct('_id');
      officeFilter = { office_id: { $in: officesInBranches } };
    }

    // 🟢 4) Get bookings in the range
    const bookings = await Booking.find({
      ...officeFilter,
      start_date: { $lt: endDate },
      end_date: { $gte: startDate },
    })
      .populate({ path: 'office_id', populate: { path: 'branch_id' } })
      .populate('client_id');

    console.log('📑 Total Bookings:', bookings.length);

    // 🟢 5) Loop: calculate totals
    let totalDownPayments = 0;
    let totalChequesAmount = 0;
    const reportData = [];

    bookings.forEach((booking) => {
      console.log('===========================');
      console.log('Booking ID:', booking._id);
      console.log('Booking Start Date (Original):', booking.start_date.toISOString());

      // ✅ Force start_date to UTC day only
      const bookingStartDateUTC = new Date(
        Date.UTC(
          booking.start_date.getUTCFullYear(),
          booking.start_date.getUTCMonth(),
          booking.start_date.getUTCDate()
        )
      );

      console.log('Booking Start Date UTC:', bookingStartDateUTC.toISOString());

      let downPaymentAmount = 0;
      if (bookingStartDateUTC >= startDate && bookingStartDateUTC < endDate) {
        downPaymentAmount = booking.initial_payment || 0;
      }

      console.log('✔️ Include DownPayment:', bookingStartDateUTC >= startDate && bookingStartDateUTC < endDate);
      console.log('➡️ DownPayment Amount:', downPaymentAmount);

      totalDownPayments += downPaymentAmount;

      // ✅ Cheques in range
      let chequesAmount = 0;
      if (Array.isArray(booking.cheques)) {
        booking.cheques.forEach((cheque) => {
          if (cheque.due_date) {
            const chequeDueDateUTC = new Date(
              Date.UTC(
                cheque.due_date.getUTCFullYear(),
                cheque.due_date.getUTCMonth(),
                cheque.due_date.getUTCDate()
              )
            );
            console.log('Cheque Due Date (Original):', cheque.due_date.toISOString());
            console.log('Cheque Due Date UTC:', chequeDueDateUTC.toISOString());

            if (chequeDueDateUTC >= startDate && chequeDueDateUTC < endDate) {
              chequesAmount += cheque.amount || 0;
            }
          }
        });
      }

      console.log('💰 Cheques Amount:', chequesAmount);

      totalChequesAmount += chequesAmount;

      reportData.push({
        office: booking.office_id?.office_number || 'N/A',
        branch: booking.office_id?.branch_id?.name || 'N/A',
        client: booking.client_id?.company_en || 'N/A',
        down_payment: downPaymentAmount,
        cheques_amount: chequesAmount,
      });
    });

    const totalExpectedRevenue = totalDownPayments + totalChequesAmount;
    const totalPaid = totalDownPayments; // + cheques payments لو محتاج تحسب التحصيل
    const collectionRate = totalExpectedRevenue === 0 ? 0 : (totalPaid / totalExpectedRevenue) * 100;

    console.log('===========================');
    console.log('✅ Total DownPayments:', totalDownPayments);
    console.log('✅ Total Cheques Amount:', totalChequesAmount);
    console.log('✅ Expected Revenue:', totalExpectedRevenue);

    // 🟢 6) Render
    res.render('revenueReport', {
      selectedMonth,
      selectedYear,
      selectedBranchIds,
      branches,
      reportData,
      totalDownPayments: totalDownPayments.toFixed(2),
      totalChequesAmount: totalChequesAmount.toFixed(2),
      totalExpectedRevenue: totalExpectedRevenue.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      collectionRate: collectionRate.toFixed(2),
    });

  } catch (err) {
    console.error('❌ Revenue Route Error:', err);
    res.status(500).send('Internal Server Error');
  }
});







// Timeline Report Route




// ✅ ملف Reports.js أو routes/reports.js





// ✅ routes/Reports.js


router.get("/timeline", async (req, res) => {
  const range = req.query.range || "3months";
  const startMonth = req.query.startMonth || "";
  const endMonth = req.query.endMonth || "";

  let startDate, endDate;

  if (range === "custom" && startMonth && endMonth) {
    startDate = new Date(`${startMonth}-01`);
    endDate = new Date(`${endMonth}-01`);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let monthsBack = 3;
    if (range === "6months") monthsBack = 6;
    if (range === "9months") monthsBack = 9;
    if (range === "12months") monthsBack = 12;

    startDate = new Date(currentYear, currentMonth - (monthsBack - 1), 1);
    endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  }

  console.log(`Aggregation ➜ From ${startDate.toISOString()} To ${endDate.toISOString()}`);

  // ✅ Bookings Count per month
  const bookingsCounts = await Booking.aggregate([
    {
      $match: {
        start_date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$start_date" },
          year: { $year: "$start_date" },
        },
        bookingsCount: { $sum: 1 },
      },
    },
  ]);

  // ✅ Payments per month
  const paymentsCounts = await Booking.aggregate([
    { $unwind: "$payments" },
    {
      $match: {
        "payments.payment_date": { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$payments.payment_date" },
          year: { $year: "$payments.payment_date" },
        },
        paid: { $sum: "$payments.amount" },
      },
    },
  ]);

  // ✅ Cheques per month
  const chequesCounts = await Booking.aggregate([
    { $unwind: "$cheques" },
    { $unwind: "$cheques.payments" },
    {
      $match: {
        "cheques.payments.paid_date": { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$cheques.payments.paid_date" },
          year: { $year: "$cheques.payments.paid_date" },
        },
        paid: { $sum: "$cheques.payments.paid_amount" },
      },
    },
  ]);

  // ✅ Combine & Normalize
  const monthMap = new Map();

  bookingsCounts.forEach((b) => {
    const key = `${b._id.month}-${b._id.year}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { paid: 0, bookingsCount: 0, label: "" });
    }
    const monthName = new Date(b._id.year, b._id.month - 1).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthMap.get(key).bookingsCount = b.bookingsCount;
    monthMap.get(key).label = monthName;
  });

  paymentsCounts.forEach((p) => {
    const key = `${p._id.month}-${p._id.year}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { paid: 0, bookingsCount: 0, label: "" });
    }
    const monthName = new Date(p._id.year, p._id.month - 1).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthMap.get(key).paid += p.paid;
    monthMap.get(key).label = monthName;
  });

  chequesCounts.forEach((c) => {
    const key = `${c._id.month}-${c._id.year}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { paid: 0, bookingsCount: 0, label: "" });
    }
    const monthName = new Date(c._id.year, c._id.month - 1).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthMap.get(key).paid += c.paid;
    monthMap.get(key).label = monthName;
  });

  const dataPoints = Array.from(monthMap.values()).sort((a, b) => {
    const [aMonth, aYear] = a.label.split(" ");
    const [bMonth, bYear] = b.label.split(" ");
    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];
    const aIdx = parseInt(aYear) * 12 + months.indexOf(aMonth);
    const bIdx = parseInt(bYear) * 12 + months.indexOf(bMonth);
    return aIdx - bIdx;
  });

  res.render("revenueTimeline", {
    range,
    startMonth,
    endMonth,
    dataPoints,
  });
});



module.exports = router;
