const express = require('express');
const router = express.Router();
const Report = require('../../models/DailyReport'); // ✅ الاسم منطبق مع الـ Schema الحقيقي
const User = require('../../models/User');
const CallReport = require('../../models/CallReport');
const DailyReport = require('../../models/DailyReport');
const mongoose = require('mongoose'); // ✅ تضيف دي فوق عشان تستخدم isValidObjectId
const isValidObjectId = mongoose.Types.ObjectId.isValid;
// ✅ Dashboard: GET /admin/reports
const Branch = require('../../models/Branch'); // لو عندك موديل Branch

const { authenticateJWT } = require('../../middlewares/auth');

router.get('/', authenticateJWT,async (req, res) => {
  try {
    const filter = {};

    if (req.query.date) {
      const selectedDate = new Date(req.query.date);
      selectedDate.setUTCHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      console.log('📅 Dashboard created_at filter:', selectedDate.toISOString(), '➡️', nextDate.toISOString());
      filter.created_at = { $gte: selectedDate, $lt: nextDate };
    }

    if (req.query.user_id) {
      filter.user_id = req.query.user_id;
      console.log('👤 Dashboard filter user:', filter.user_id);
    }

    if (req.query.branch_id) {
      filter.branch_id = req.query.branch_id; // ✅ استخدم الـ branch_id مباشرةً من الـ report
      console.log('🏢 Dashboard filter branch:', filter.branch_id);
    }

    const reports = await Report.find(filter)
      .populate('user_id')
      .populate('branch_id') // ✅ Populating الفرع مباشر
      .sort({ created_at: -1 });

    const users = await User.find();
    const branches = await Branch.find();

    res.render('admin/reports-dashboard', { user: req.user,reports, users, branches });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});
  

// ✅ API فلترة لحظية: GET /admin/reports/api
router.get('/api', async (req, res) => {
  try {
    const filter = {};

    // ✅ فلتر التاريخ
    if (req.query.date) {
      const selectedDate = new Date(req.query.date);
      selectedDate.setUTCHours(0, 0, 0, 0);
      const nextDate = new Date(selectedDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      filter.created_at = { $gte: selectedDate, $lt: nextDate };
      console.log('📅 Filter Date:', filter.created_at);
    }

    // ✅ فلتر الموظف
    if (req.query.user_id) {
      filter.user_id = req.query.user_id;
      console.log('👤 Filter User:', filter.user_id);
    }

    // ✅ فلتر الفرع: لازم تستخدم branch_id من الاسكيمة مش user_id.branch
    if (req.query.branch_id) {
      filter.branch_id = req.query.branch_id;
      console.log('🏢 Filter Branch:', filter.branch_id);
    }

    console.log('📣 Final Filter:', filter);

    const reports = await Report.find(filter)
      .populate('user_id')    // عشان تجيب بيانات الموظف
      .populate('branch_id')  // عشان تجيب بيانات الفرع
      .sort({ created_at: -1 });

    if (reports.length) {
      console.log('✅ Sample Report:', {
        user: reports[0].user_id?.name,
        branch: reports[0].branch_id?.name || reports[0].branch_name
      });
    }

    res.json(reports);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err });
  }
});




// ✅ تفاصيل تقرير واحد: GET /admin/reports/:id


router.get('/all', authenticateJWT, async (req, res) => {
  try {
    const callReports = await CallReport.find()
      .populate('employee_id') // افترض ان عندك ref للموظف
      .sort({ call_date: -1 }); // الأحدث أولاً

    res.render('callReports/all', {
      user: req.user,
      callReports
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.get('/overview', authenticateJWT, async (req, res) => {
  try {
    const dailyReports = await Report.find().populate('user_id');
    const callReports = await CallReport.find().populate('employee_id');
    const fullDailyReports = await DailyReport.find().populate('user_id branch_id');

    console.log('------ SAMPLE OUTPUT ------');
    console.log('🟢 Daily Report:', dailyReports[0]);
    console.log('🟢 Call Report:', callReports[0]);
    console.log('🟢 Full Daily Report:', fullDailyReports[0]);
    console.log('---------------------------');

    res.render('reports/overview', {
      user: req.user,
      dailyReports,
      callReports,
      fullDailyReports
    });

  } catch (err) {
    console.error('[ERROR] /admin/reports/overview:', err);
    res.status(500).send('Server Error');
  }
});

// ✅ src/routes/yourRoutes.js أو أينما تضعه

// ✅ src/routes/callReports.js

// ✅ src/routes/adminReports.js (مثلاً)

router.get('/call-reports', authenticateJWT, async (req, res) => {
  try {
    const { employee_id, date } = req.query;

    // ✅ فلتر المكالمات العادية
    const filter = {
      overdue: { $ne: true }
    };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.call_date = { $gte: start, $lt: end };
    }

    if (employee_id) {
      filter.employee_id = employee_id;
    }

    console.log('✅ Normal Calls Filter:', filter);

    // ✅ تحديث الـ Overdue: شرط أوسع
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueResult = await CallReport.updateMany(
      {
        $or: [
          { answered: false },
          { $and: [
              { answered: true },
              { $or: [
                  { followed_up: false },
                  { follow_up_logs: { $size: 0 } },
                  { followed_up: { $exists: false } }
                ]
              }
            ]
          }
        ],
        marked_done: { $ne: true },
        overdue: { $ne: true },
        call_date: { $lt: today }
      },
      { $set: { overdue: true } }
    );

    console.log(`🔄 Updated Overdue: ${overdueResult.modifiedCount}`);

    // ✅ جلب المكالمات العادية
    const callReports = await CallReport.find(filter)
      .populate('employee_id', 'name')
      .sort({ call_date: -1 });

    // ✅ فلتر المكالمات المتأخرة الصحيح
    const overdueFilter = {
      overdue: true,
      call_date: { $lt: today },
      marked_done: { $ne: true }
    };

    if (employee_id) {
      overdueFilter.employee_id = employee_id;
    }

    console.log('✅ Overdue Calls Filter:', overdueFilter);

    const overdueCalls = await CallReport.find(overdueFilter)
      .populate('employee_id', 'name')
      .sort({ call_date: -1 });

    console.log('📊 Normal Calls Count:', callReports.length);
    console.log('📊 Overdue Calls Count:', overdueCalls.length);

    const users = await User.find({}, 'name');

    res.render('admin/call-reports/index', {
      user: req.user,
      callReports,
      overdueCalls,
      users,
      query: {
        employee_id: employee_id || '',
        date: date || ''
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



/* ✅ 2) تفاصيل مكالمة واحدة: /admin/reports/call-reports/:id */
router.get('/call-reports/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).send('Invalid ID format');
  }

  const report = await CallReport.findById(id)
    .populate('employee_id', 'name');

  if (!report) {
    return res.status(404).send('Call Report not found');
  }

  res.render('admin/call-reports/show', {
    user: req.user,
    report
  });
});


/* ✅ 3) تفاصيل تقرير يومي: /admin/reports/:id (دايماً آخر واحد) */
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).send('Invalid ID format');
  }

  const report = await Report.findById(id)
    .populate('user_id')
    .populate('branch_id');

  if (!report) {
    return res.status(404).send('Daily Report not found');
  }

  res.render('admin/report-details', {
    user: req.user,
    report
  });
});


module.exports = router;
