// ✅ src/routes/callReports.js

require('dotenv').config();
const express = require('express');
const router = express.Router();

const CallReport = require('../models/CallReport');
const Office = require('../models/Office');
const Booking = require('../models/Booking');
const Branch = require('../models/Branch'); // تأكد إن عندك موديل الفروع

const DailyReport = require('../models/DailyReport');

const { authenticateJWT } = require('../middlewares/auth');

// ✅ 📌 إضافة مكالمة جديدة
router.get('/add', authenticateJWT, (req, res) => {
  res.render('callReports/add', { user: req.user });
});

router.post('/add', authenticateJWT, async (req, res) => {
  const { call_date, phone_number, source, action, answered, client_name } = req.body;
await CallReport.create({
  employee_id: req.user.id,
  client_name: req.body.client_name || '', // ✅ هنا
  call_date,
  phone_number,
  source,
  action,
  answered: answered === 'on'
});


  res.redirect('/call-reports/pending');
});


// ✅ 📌 عرض الأرقام اللي مردش عليها + Check Overdue
router.get('/pending', authenticateJWT, async (req, res) => {
  try {
    console.log('🔑 JWT Decoded:', req.user);

    const userId = req.user.id;

    // تحديث المكالمات المتأخرة
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await CallReport.updateMany(
      {
        employee_id: userId,
        answered: false,
        overdue: { $ne: true },
        marked_done: { $ne: true },
        call_date: { $lt: today }
      },
      { $set: { overdue: true } }
    );

    console.log(`🚨 Marked ${result.modifiedCount} calls as overdue.`);

   const calls = await CallReport.find({ employee_id: userId })
  .populate('employee_id', 'name')
  .sort({ call_date: -1 });


    res.render('callReports/pending', {
      user: req.user,
      calls
    });

  } catch (err) {
    console.error('❌ Error fetching pending calls:', err);
    res.status(500).send('Server Error');
  }
});

// ✅ 📌 متابعة رقم مردش عليه
router.post('/follow-up/:id', authenticateJWT, async (req, res) => {
  await CallReport.findByIdAndUpdate(req.params.id, {
    followed_up: true,
    last_follow_up: new Date()
  });
  res.redirect('/call-reports/pending');
});

// ✅ 📌 إضافة مكالمات متعددة
router.post('/add-multiple', authenticateJWT, async (req, res) => {
  try {
    const calls = req.body.calls;
    if (!calls || !Array.isArray(calls)) {
      return res.status(400).send('Invalid data');
    }

   const docs = calls.map(c => ({
  employee_id: req.user.id,
   client_name: c.client_name, // ✅ مهمة هنا
  call_date: new Date(),
  phone_number: c.phone_number,
  source: c.source,
  action: c.action,
  answered: c.answered === 'on'
}));

    await CallReport.insertMany(docs);

    res.redirect('/call-reports/pending');
  } catch (err) {
    console.error('❌ Error adding multiple call reports:', err);
    res.status(500).send('Server Error');
  }
});


// ✅ 📌 صفحة تعديل المكالمة
router.get('/:id/edit', authenticateJWT, async (req, res) => {
  try {
    const call = await CallReport.findById(req.params.id);
    if (!call) return res.status(404).send('Call not found');

    res.render('callReports/edit', {
      user: req.user,
      call
    });
  } catch (err) {
    console.error('❌ Error fetching call for edit:', err);
    res.status(500).send('Server Error');
  }
});

router.put('/:id', authenticateJWT, async (req, res) => {
  const {
    phone_number,
    source,
    action,
    call_date,
    answered,
    followed_up,
    follow_up_logs // ✅ مهم جدا!
  } = req.body;

  const updateData = {
    phone_number,
    source,
    action,
    answered: answered === 'on',
    followed_up: followed_up === 'on',
    last_follow_up: new Date() // ✅ يحدّث آخر تاريخ متابعة
  };

  if (call_date && !isNaN(new Date(call_date).getTime())) {
    updateData.call_date = new Date(call_date);
  }

  if (follow_up_logs) {
    // ✅ يضيف كل اللي جاي جديد مش يستبدل!
    updateData.$push = {
      follow_up_logs: {
        $each: Array.isArray(follow_up_logs) ? follow_up_logs : [follow_up_logs]
      }
    };
  }

  await CallReport.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/call-reports/pending');
});


// ✅ 📌 تحديث + إضافة سجل متابعة
router.post('/:id/update', authenticateJWT, async (req, res) => {
  try {
    const { action, answered, follow_up_note } = req.body;

    const followUpEntry = {
      date: new Date(),
      note: follow_up_note || action
    };

    await CallReport.findByIdAndUpdate(req.params.id, {
      $set: {
        action,
        answered: answered === 'on',
        last_follow_up: new Date(),
        followed_up: true
      },
      $push: { follow_up_logs: followUpEntry }
    });

    res.redirect('/call-reports/pending');
  } catch (err) {
    console.error('❌ Error updating call:', err);
    res.status(500).send('Server Error');
  }
});


// ✅ 📌 علامة "تم"
router.post('/:id/mark-done', authenticateJWT, async (req, res) => {
  try {
    await CallReport.findByIdAndUpdate(req.params.id, {
      marked_done: true,
      overdue: false
    });
    res.redirect('/call-reports/pending');
  } catch (err) {
    console.error('❌ Error marking call done:', err);
    res.status(500).send('Server Error');
  }
});

// ✅ 📌 Dashboard
router.get('/dashboard', authenticateJWT, (req, res) => {
  res.render('reports/dashboard', { user: req.user });
});

// // ✅ 📌 Daily Reports POST (يحفظ user_id)// ✅ 📌 Daily Reports POST (يحفظ user_id ويخزن كل المكاتب صح)
//   router.post('/daily-reports', authenticateJWT, async (req, res) => {
//     try {
//       const data = req.body;

//       console.log('✅ DATA:', data);
//       console.log('🔑 Authenticated User:', req.user);

//       const report = new DailyReport({
//         user_id: req.user.id,

//         office_id: data.office_id || null,

//         // ✅ Today’s Rent Collection
//         rent_office_no: Array.isArray(data.rent_office_no)
//           ? data.rent_office_no
//           : [data.rent_office_no].filter(Boolean),

//         rent_company_name: Array.isArray(data.rent_company_name)
//           ? data.rent_company_name
//           : [data.rent_company_name].filter(Boolean),

//         rent_amount: Array.isArray(data.rent_amount)
//           ? data.rent_amount
//           : [data.rent_amount].filter(Boolean),

//         rent_due_date: Array.isArray(data.rent_due_date)
//           ? data.rent_due_date
//           : [data.rent_due_date].filter(Boolean),

//         rent_date_paid: Array.isArray(data.rent_date_paid)
//           ? data.rent_date_paid
//           : [data.rent_date_paid].filter(Boolean),

//         rent_money_destination: Array.isArray(data.rent_money_destination)
//           ? data.rent_money_destination
//           : [data.rent_money_destination].filter(Boolean),

//         // ✅ Visits
//         visits_count: data.visits_count ? parseInt(data.visits_count) : 0,
//         visits_details: Array.isArray(data.visits_details)
//           ? data.visits_details
//           : [data.visits_details].filter(Boolean),

//         // ✅ Payments
//         payment_ejari: Array.isArray(data.payment_ejari)
//           ? data.payment_ejari
//           : [data.payment_ejari].filter(Boolean),

//         payment_dp: Array.isArray(data.payment_dp)
//           ? data.payment_dp
//           : [data.payment_dp].filter(Boolean),

//         payment_booking: Array.isArray(data.payment_booking)
//           ? data.payment_booking
//           : [data.payment_booking].filter(Boolean),

//         payment_etc: Array.isArray(data.payment_etc)
//           ? data.payment_etc
//           : [data.payment_etc].filter(Boolean),

//     // ✅ Inspections
// inspection_count: data.inspection_count ? parseInt(data.inspection_count) : 0,

// inspection_office_no: Array.isArray(data.inspection_office_no)  // 🆕 مضافة هنا
//   ? data.inspection_office_no
//   : [data.inspection_office_no].filter(Boolean),

// inspection_companies: Array.isArray(data.inspection_companies)
//   ? data.inspection_companies
//   : [data.inspection_companies].filter(Boolean),

// inspection_type: Array.isArray(data.inspection_type)
//   ? data.inspection_type
//   : [data.inspection_type].filter(Boolean),

// inspection_order: Array.isArray(data.inspection_order)
//   ? data.inspection_order
//   : [data.inspection_order].filter(Boolean),

// inspection_ejari_unit: Array.isArray(data.inspection_ejari_unit)
//   ? data.inspection_ejari_unit
//   : [data.inspection_ejari_unit].filter(Boolean),

//         // ✅ Counts & Messages
//         available_offices: data.available_offices ? parseInt(data.available_offices) : 0,

//         messages_whatsapp: data.messages_whatsapp ? parseInt(data.messages_whatsapp) : 0,
//         messages_dubizzle: data.messages_dubizzle ? parseInt(data.messages_dubizzle) : 0,
//         messages_bayut: data.messages_bayut ? parseInt(data.messages_bayut) : 0,
//         messages_property_finder: data.messages_property_finder ? parseInt(data.messages_property_finder) : 0,

//         arriving_time: data.arriving_time || '',
//         leaving_time: data.leaving_time || ''
//       });

//       await report.save();
//       console.log('✅ Report Saved:', report);

//       res.redirect('/call-reports/dashboard');
//     } catch (err) {
//       console.error('❌ Error saving daily report:', err);
//       res.status(500).send('Something went wrong!');
//     }
//   });


// ✅ 📌 Daily Reports POST
router.post('/daily-reports', authenticateJWT, async (req, res) => {
  try {
    const data = req.body;

    console.log('✅ DATA:', data);
    console.log('🔑 Authenticated User:', req.user);

    if (!req.user.id) {
      throw new Error('🚫 JWT does not contain user ID!');
    }

    let branchName = 'Unknown Branch';

    if (data.branch_id) {
      const branch = await Branch.findById(data.branch_id);
      branchName = branch?.name || 'Unknown Branch';
    } else if (req.user.branch_name) {
      branchName = req.user.branch_name;
    }

    const report = new DailyReport({
      user_id: req.user.id,
      branch_id: data.branch_id || null,
      branch_name: branchName,
      office_id: data.office_id || null,
      rent_office_no: Array.isArray(data.rent_office_no) ? data.rent_office_no : [data.rent_office_no].filter(Boolean),
      rent_company_name: Array.isArray(data.rent_company_name) ? data.rent_company_name : [data.rent_company_name].filter(Boolean),
      rent_amount: Array.isArray(data.rent_amount) ? data.rent_amount : [data.rent_amount].filter(Boolean),
      rent_due_date: Array.isArray(data.rent_due_date) ? data.rent_due_date : [data.rent_due_date].filter(Boolean),
      rent_date_paid: Array.isArray(data.rent_date_paid) ? data.rent_date_paid : [data.rent_date_paid].filter(Boolean),
      rent_money_destination: Array.isArray(data.rent_money_destination) ? data.rent_money_destination : [data.rent_money_destination].filter(Boolean),
      visits_count: data.visits_count ? parseInt(data.visits_count) : 0,
      visits_details: Array.isArray(data.visits_details) ? data.visits_details : [data.visits_details].filter(Boolean),
      payment_ejari: Array.isArray(data.payment_ejari) ? data.payment_ejari : [data.payment_ejari].filter(Boolean),
      payment_dp: Array.isArray(data.payment_dp) ? data.payment_dp : [data.payment_dp].filter(Boolean),
      payment_booking: Array.isArray(data.payment_booking) ? data.payment_booking : [data.payment_booking].filter(Boolean),
      payment_etc: Array.isArray(data.payment_etc) ? data.payment_etc : [data.payment_etc].filter(Boolean),
      inspection_count: data.inspection_count ? parseInt(data.inspection_count) : 0,
      inspection_office_no: Array.isArray(data.inspection_office_no) ? data.inspection_office_no : [data.inspection_office_no].filter(Boolean),
      inspection_companies: Array.isArray(data.inspection_companies) ? data.inspection_companies : [data.inspection_companies].filter(Boolean),
      inspection_type: Array.isArray(data.inspection_type) ? data.inspection_type : [data.inspection_type].filter(Boolean),
      inspection_order: Array.isArray(data.inspection_order) ? data.inspection_order : [data.inspection_order].filter(Boolean),
      inspection_ejari_unit: Array.isArray(data.inspection_ejari_unit) ? data.inspection_ejari_unit : [data.inspection_ejari_unit].filter(Boolean),
      available_offices: data.available_offices ? parseInt(data.available_offices) : 0,
      messages_whatsapp: data.messages_whatsapp ? parseInt(data.messages_whatsapp) : 0,
      messages_dubizzle: data.messages_dubizzle ? parseInt(data.messages_dubizzle) : 0,
      messages_bayut: data.messages_bayut ? parseInt(data.messages_bayut) : 0,
      messages_property_finder: data.messages_property_finder ? parseInt(data.messages_property_finder) : 0,
      arriving_time: data.arriving_time || '',
      leaving_time: data.leaving_time || ''
    });

    await report.save();
    console.log('✅ Report Saved:', report);

    res.redirect('/call-reports/dashboard');
  } catch (err) {
    console.error('❌ Error saving daily report:', err);
    res.status(500).send('Something went wrong!');
  }
});



// ✅ 📌 صفحة إضافة تقرير


router.get('/daily-reports/new', authenticateJWT, async (req, res) => {
  try {
    console.log('✅ JWT user:', JSON.stringify(req.user, null, 2));

    // Force branches always array:
    if (!req.user.branches || !Array.isArray(req.user.branches)) {
      if (req.user.branch) {
        req.user.branches = [req.user.branch];
      } else {
        req.user.branches = [];
      }
    }

    console.log('📌 req.user.branch:', req.user.branch);
    console.log('📌 req.user.branches:', req.user.branches);

    let branches = [];

    // ⬇️ هنا تحطها
    if (req.user.branches.length > 0) {
      console.log('🔍 Finding branches:', req.user.branches);
      branches = await Branch.find({ _id: { $in: req.user.branches } });
      console.log('✅ Found branches:', branches);
    } else {
      console.log('🌍 Fetching ALL branches!');
      branches = await Branch.find();
    }

    return res.render('reports/daily-report-new', {
      user: req.user,
      branches
    });

  } catch (err) {
    console.error('❌ Error in /daily-reports/new:', err);
    res.status(500).send('Server Error');
  }
});






// ✅ 📌 قائمة التقارير اليومية
router.get('/daily-reports', authenticateJWT, async (req, res) => {
  const reports = await DailyReport.find({ user_id: req.user.id }).sort({ created_at: -1 });

  res.render('reports/daily-reports-list', {
    reports,
    user: req.user // ✨ مهم جدًا!
  });
});



// ✅ 📌 تفاصيل تقرير واحد
router.get('/daily-reports/:id', authenticateJWT, async (req, res) => {
  try {
    console.log('🔍 Report ID:', req.params.id);
    const report = await DailyReport.findById(req.params.id).populate('user_id');

    if (!report) {
      return res.status(404).send('Report not found');
    }

    res.render('reports/daily-report-show', {user: req.user, report });
  } catch (err) {
    console.error('❌ Error fetching daily report:', err);
    res.status(500).send('Server Error');
  }
});


// ✅ 📌 ابحث عن المكاتب
router.get('/offices/search', async (req, res) => {
  const number = req.query.number;
  if (!number) return res.json([]);

  try {
    const offices = await Office.find({
      office_number: { $regex: number, $options: 'i' }
    }).limit(10).populate('branch_id');

    const results = offices.map(o => ({
      id: o._id,
      number: o.office_number,
      branch: o.branch_id?.name || 'N/A'
    }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// ✅ 📌 بيانات الحجز المرتبط بمكتب
router.get('/offices/:id/booking-info', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      office_id: req.params.id,
      status: 'active'
    }).populate('client_id');

    if (!booking) {
      return res.json({ found: false, msg: 'No active booking found' });
    }

    res.json({
      found: true,
      amount: booking.total_price || 0,
      due_date: booking.start_date || null,
      date_paid: booking.end_date || null,
      company: booking.client_id?.company_en || 'N/A',
      ejari_unit: booking.ejari_no || ''
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ found: false, msg: 'Server error' });
  }
});


router.get('/daily-reports/:id/edit', authenticateJWT, async (req, res) => {
  const report = await DailyReport.findById(req.params.id);

  if (!report) {
    return res.status(404).send('Report not found');
  }

  res.render('reports/edit', { 
    report,
    user: req.user  // ✅ ضيف اليوزر هنا!
  });
});



router.put('/daily-reports/:id', authenticateJWT, async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) return res.status(404).send('Report not found');

    // ✅ تأكد إن لسه جوه الوقت المسموح
    const createdAt = new Date(report.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 10) {
      return res.status(403).send('🚫 عفواً لا يمكنك تعديل هذا التقرير.. مرّ أكثر من 10 دقائق!');
    }

    const data = req.body;

    console.log('✅ DATA FOR UPDATE:', data);

    const updated = await DailyReport.findByIdAndUpdate(
      req.params.id,
      {
        office_id: data.office_id || null,

        rent_office_no: Array.isArray(data.rent_office_no)
          ? data.rent_office_no
          : [data.rent_office_no].filter(Boolean),

        rent_amount: Array.isArray(data.rent_amount)
          ? data.rent_amount
          : [data.rent_amount].filter(Boolean),

        rent_due_date: Array.isArray(data.rent_due_date)
          ? data.rent_due_date
          : [data.rent_due_date].filter(Boolean),

        rent_date_paid: Array.isArray(data.rent_date_paid)
          ? data.rent_date_paid
          : [data.rent_date_paid].filter(Boolean),

        rent_money_destination: Array.isArray(data.rent_money_destination)
          ? data.rent_money_destination
          : [data.rent_money_destination].filter(Boolean),

        visits_count: data.visits_count ? parseInt(data.visits_count) : 0,
        visits_details: Array.isArray(data.visits_details)
          ? data.visits_details
          : [data.visits_details].filter(Boolean),

        payment_ejari: Array.isArray(data.payment_ejari)
          ? data.payment_ejari
          : [data.payment_ejari].filter(Boolean),

        payment_dp: Array.isArray(data.payment_dp)
          ? data.payment_dp
          : [data.payment_dp].filter(Boolean),

        payment_booking: Array.isArray(data.payment_booking)
          ? data.payment_booking
          : [data.payment_booking].filter(Boolean),

        payment_etc: Array.isArray(data.payment_etc)
          ? data.payment_etc
          : [data.payment_etc].filter(Boolean),

        inspection_count: data.inspection_count ? parseInt(data.inspection_count) : 0,
        inspection_companies: Array.isArray(data.inspection_companies)
          ? data.inspection_companies
          : [data.inspection_companies].filter(Boolean),

        inspection_type: Array.isArray(data.inspection_type)
          ? data.inspection_type
          : [data.inspection_type].filter(Boolean),

        inspection_order: Array.isArray(data.inspection_order)
          ? data.inspection_order
          : [data.inspection_order].filter(Boolean),

        inspection_ejari_unit: Array.isArray(data.inspection_ejari_unit)
          ? data.inspection_ejari_unit
          : [data.inspection_ejari_unit].filter(Boolean),

        available_offices: data.available_offices ? parseInt(data.available_offices) : 0,

        messages_whatsapp: data.messages_whatsapp ? parseInt(data.messages_whatsapp) : 0,
        messages_dubizzle: data.messages_dubizzle ? parseInt(data.messages_dubizzle) : 0,
        messages_bayut: data.messages_bayut ? parseInt(data.messages_bayut) : 0,
        messages_property_finder: data.messages_property_finder ? parseInt(data.messages_property_finder) : 0,

        arriving_time: data.arriving_time || '',
        leaving_time: data.leaving_time || ''
      },
      { new: true }
    );

    console.log('✅ Report Updated:', updated);

    res.redirect('/call-reports/dashboard'); // أو أي مسار بعد التعديل
  } catch (err) {
    console.error('❌ Error updating daily report:', err);
    res.status(500).send('Something went wrong during update!');
  }
});

// ✅ Route: متابعة
router.post('/call-reports/:id/follow-up', authenticateJWT, async (req, res) => {
  try {
    const { note } = req.body;

    const update = {
      $set: {
        followed_up: true,
        last_follow_up: new Date()
      },
      $push: {
        follow_up_logs: {
          date: new Date(),
          note: note || 'No note added'
        }
      }
    };

    await CallReport.findByIdAndUpdate(req.params.id, update);

    res.redirect('/call-reports/pending'); // أو أي صفحة تانية
  } catch (err) {
    console.error('❌ Error updating follow-up:', err);
    res.status(500).send('Server Error');
  }
});

router.put('/call-reports/:id', authenticateJWT, async (req, res) => {
  try {
    const { follow_up_logs, ...rest } = req.body;

    const updateData = {
      phone_number: rest.phone_number,
      source: rest.source,
      action: rest.action,
      call_date: isNaN(new Date(rest.call_date).getTime()) ? null : new Date(rest.call_date),
      answered: rest.answered === 'on',
      followed_up: rest.followed_up === 'on',
    };

    if (follow_up_logs) {
      const logsArray = Array.isArray(follow_up_logs) ? follow_up_logs : [follow_up_logs];
      if (logsArray.length > 0) {
        updateData.$push = { follow_up_logs: { $each: [] } };
        logsArray.forEach(log => {
          updateData.$push.follow_up_logs.$each.push({
            date: log.date || new Date(),
            note: log.note
          });
        });
        updateData.last_follow_up = new Date();
      }
    }

    await CallReport.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/call-reports/pending');
  } catch (err) {
    console.error('❌ Error updating Call Report:', err);
    res.status(500).send('Server Error');
  }
});


router.get('/:id/timeline', authenticateJWT, async (req, res) => {
  try {
    const call = await CallReport.findById(req.params.id).populate('employee_id', 'name');
    if (!call) return res.status(404).send('Call Report not found');

    res.render('admin/call-reports/timeline', {
      user: req.user,
      call
    });
  } catch (err) {
    console.error('❌ Error fetching call timeline:', err);
    res.status(500).send('Server Error');
  }
});
module.exports = router;
