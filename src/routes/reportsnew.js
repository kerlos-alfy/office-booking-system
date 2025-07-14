const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Branch = require('../models/Branch'); // تأكد إن عندك موديل الفروع
const moment = require('moment');

// ✅ تقرير المستحقات الشهرية: Down Payment + Cheques
router.get('/monthly-dues', async (req, res) => {
  try {
    const selectedMonth = parseInt(req.query.month) || new Date().getMonth();
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
    const selectedBranchId = req.query.branch_id || '';

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    // ✅ فلترة حسب الفرع لو متحدد
    const branchFilter = selectedBranchId ? { 'office_id.branch_id': selectedBranchId } : {};

    // ✅ Populate كامل مع الفرع
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

    let totalDues = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let overdueCollected = 0;

    let totalDownPayments = 0;
    let totalCheques = 0;

    const dues = [];
    const overdueDues = [];

    bookings.forEach(booking => {
      const branchNameForThis = booking.office_id?.branch_id?.name || 'N/A';

      // ✅ Down Payment
      if (booking.start_date >= startOfMonth && booking.start_date <= endOfMonth) {
        totalDues += booking.initial_payment;
        totalPaid += booking.initial_payment;
        totalDownPayments += booking.initial_payment;

        dues.push({
          officeNumber: booking.office_id?.office_number || 'N/A',
          clientName: booking.client_id?.company_name || booking.client_id?.company_en || 'N/A',
          branchName: branchNameForThis,
          amount: booking.initial_payment,
          paid: booking.initial_payment,
          dueDate: booking.start_date,
          paidDate: booking.start_date, // ✅ الداون بيمنت يعتبر مدفوع كله في البداية
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
            branchName: branchNameForThis,
            amount: cheque.amount,
            paid: paid,
            dueDate: cheque.due_date,
            paidDate: lastPaidDate, // ✅ آخر دفعة للشيك
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
            branchName: branchNameForThis,
            amount: cheque.amount,
            paid: paid,
            dueDate: cheque.due_date,
            paidDate: lastPaidDate, // ✅ آخر دفعة للشيك المتأخر
            type: 'Cheque',
            canceled: false,
            cancelDate: null
          });
        }
      });
    });

    const branches = await Branch.find();
    const branchName = selectedBranchId
      ? branches.find(bb => bb._id.toString() === selectedBranchId)?.name || ''
      : '';

    res.render('monthlyDues', {
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
    console.error(err);
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
