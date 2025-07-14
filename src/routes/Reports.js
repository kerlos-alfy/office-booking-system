const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Office = require('../models/Office');
const moment = require('moment');
const { authenticateJWT, hasPermission } = require('../middlewares/auth');

// ✅ Revenue Report: initial_payment + Cheques + Overdue + Debug\
// ✅ Revenue Report Route
/* ==============================================
   ✅ Revenue Report Route: Down Payment + Cheques
   ============================================== */
router.get('/revenue', authenticateJWT,
  hasPermission('accounting.view'),  async (req, res) => {
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


router.get("/timeline",  authenticateJWT,
  hasPermission('accounting.view'), async (req, res) => {
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

  res.render("revenueTimeline", { user: req.user, 
    range,
    startMonth,
    endMonth,
    dataPoints,
  });
});


// ✅ تقرير المستحقات الشهرية: Down Payment + Cheques
router.get('/monthly-dues', authenticateJWT,
  hasPermission('accounting.view'), async (req, res) => {
  try {
    const selectedMonth = parseInt(req.query.month) || new Date().getMonth();
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
    const selectedBranchId = req.query.branch_id || '';

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    // ✅ فلترة الفرع في حالة وجود ID
    const branchFilter = (selectedBranchId && mongoose.Types.ObjectId.isValid(selectedBranchId))
      ? { 'office_id.branch_id': new mongoose.Types.ObjectId(selectedBranchId) }
      : {};

    // ✅ جلب البيانات
    const bookings = await Booking.find({
      ...branchFilter,
      $or: [
        { 'cheques.due_date': { $lte: endOfMonth } },
        { start_date: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    })
      .populate({
        path: 'office_id',
        populate: { path: 'branch_id' }
      })
      .populate('client_id');

    // ✅ الحسابات
    let totalDues = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let overdueCollected = 0;

    let totalDownPayments = 0;
    let totalCheques = 0;

    const dues = [];
    const overdueDues = [];

    bookings.forEach(booking => {
      const branchIdForThis = booking.office_id?.branch_id?._id?.toString() || '';
      const branchNameForThis = booking.office_id?.branch_id?.name || 'N/A';

      // ✅ Down Payment
      if (booking.start_date >= startOfMonth && booking.start_date <= endOfMonth) {
        totalDues += booking.initial_payment;
        totalPaid += booking.initial_payment;
        totalDownPayments += booking.initial_payment;

        dues.push({
          officeNumber: booking.office_id?.office_number || 'N/A',
          clientName: booking.client_id?.company_name || booking.client_id?.company_en || 'N/A',
          branchId: branchIdForThis,          // ✅ هنا مهم جداً
          branchName: branchNameForThis,
          amount: booking.initial_payment,
          paid: booking.initial_payment,
          dueDate: booking.start_date,
          paidDate: booking.start_date,
          type: 'Down Payment',
          canceled: false,
          cancelDate: null
        });
      }

      // ✅ Cheques
      booking.cheques.forEach(cheque => {
        if (cheque.canceled) return;

        const paid = cheque.payments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        const lastPaidDate = cheque.payments.length > 0
          ? cheque.payments[cheque.payments.length - 1].paid_date
          : null;

        if (cheque.due_date >= startOfMonth && cheque.due_date <= endOfMonth) {
          totalDues += cheque.amount;
          totalPaid += paid;
          totalCheques += cheque.amount;

          dues.push({
            officeNumber: booking.office_id?.office_number || 'N/A',
            clientName: booking.client_id?.company_name || booking.client_id?.company_en || 'N/A',
            branchId: branchIdForThis,         // ✅ مهم جداً هنا كمان
            branchName: branchNameForThis,
            amount: cheque.amount,
            paid: paid,
            dueDate: cheque.due_date,
            paidDate: lastPaidDate,
            type: 'Cheque',
            canceled: false,
            cancelDate: null
          });
        } else if (cheque.due_date < startOfMonth && paid < cheque.amount) {
          totalOverdue += cheque.amount;
          overdueCollected += paid;

          overdueDues.push({
            officeNumber: booking.office_id?.office_number || 'N/A',
            clientName: booking.client_id?.company_name || booking.client_id?.company_en || 'N/A',
            branchId: branchIdForThis,         // ✅ حتى هنا للمتأخرين
            branchName: branchNameForThis,
            amount: cheque.amount,
            paid: paid,
            dueDate: cheque.due_date,
            paidDate: lastPaidDate,
            type: 'Cheque',
            canceled: false,
            cancelDate: null
          });
        }
      });
    });

    // ✅ كل الفروع للفلتر Frontend
    const branches = await Branch.find();
    const branchName = selectedBranchId
      ? branches.find(bb => bb._id.toString() === selectedBranchId)?.name || ''
      : '';

    res.render('monthlyDues', { user: req.user, 
      currentMonthName: startOfMonth.toLocaleString('default', { month: 'long' }),
      selectedMonth,
      selectedYear,
      dues,
      totalDues,
      totalPaid,
      totalDownPayments,
      totalCheques,
      overdueDues,
      totalOverdue,
      overdueCollected,
      branches,
      selectedBranchId,
      branchName
    });

  } catch (err) {
    console.error('❌ Server Error:', err);
    res.status(500).send('Server Error');
  }
});



router.post('/add-multiple', async (req, res) => {
  const calls = req.body.calls;

  const docs = calls.map(c => ({
    employee_id: req.user._id,
    call_date: new Date(), // او دخّلها لو عاوز لكل صف تاريخ
    phone_number: c.phone_number,
    source: c.source,
    action: c.action,
    answered: c.answered === 'on'
  }));

  await CallReport.insertMany(docs);

  res.redirect('/call-reports/pending');
});



// ✅ حفظ البيانات
router.post('/add-multiple', async (req, res) => {
  const calls = req.body.calls;

  const docs = calls.map(c => ({
    employee_id: req.user._id || 'dummy', // عدلها حسب الـ JWT
    call_date: new Date(),
    phone_number: c.phone_number,
    source: c.source,
    action: c.action,
    answered: c.answered === 'on'
  }));

  await CallReport.insertMany(docs);

  res.redirect('/call-reports/pending');
});


module.exports = router;
