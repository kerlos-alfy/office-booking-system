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


// ✅ ROUTE: Single Report by ID (always last!)
router.get('/:id', authenticateJWT, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).send('Invalid ID format');
  }

  try {
    const report = await Report.findById(req.params.id).populate('user_id').populate('branch_id');
    if (!report) {
      return res.status(404).send('Report not found');
    }

    res.render('admin/report-details', { user: req.user, report });

  } catch (err) {
    console.error('[ERROR] /admin/reports/:id:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/:id',authenticateJWT, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('user_id');

    if (!report) {
      return res.status(404).send('Report not found');
    }

    res.render('admin/report-details', { user: req.user,report });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
