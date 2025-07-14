const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const { authenticateJWT } = require('../middlewares/auth');

// ✅ صفحة شيكات الشهر + المتأخر من الشهور السابقة مع Totals كاملة
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const now = new Date();
    const selectedMonth = req.query.month ? parseInt(req.query.month) : now.getMonth();
    const selectedYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    // ✅ فلترة الفرع: لو المستخدم مربوط بفرع → يثبّت الفرع بتاعه
    let selectedBranch = req.query.branch || "";
    if (req.user.branch) {
      selectedBranch = req.user.branch;
    }

    // ✅ الفروع للـ Dropdown: فرعه بس أو الكل لو Super Admin
    const branches = req.user.branch
      ? await Branch.find({ _id: req.user.branch })
      : await Branch.find({});

    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const currentMonthName = `${monthNames[selectedMonth]} ${selectedYear}`;

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 1);

    console.log("🟢 Selected:", selectedMonth, selectedYear);
    console.log("🟢 Range:", startOfMonth.toISOString(), "-", endOfMonth.toISOString());
    console.log("🏢 Selected Branch:", selectedBranch);

    // ✅ الشرط الأساسي للتاريخ
    const matchStage = {
      "cheques.due_date": { $gte: startOfMonth, $lt: endOfMonth }
    };

    // ✅ الشيكات الشهرية
    const cheques = await Booking.aggregate([
      { $unwind: "$cheques" },

      {
        $lookup: {
          from: "offices",
          localField: "office_id",
          foreignField: "_id",
          as: "office",
        },
      },
      { $unwind: "$office" },

      { $match: matchStage },

      ...(selectedBranch ? [{
        $match: {
          "office.branch_id": new mongoose.Types.ObjectId(selectedBranch)
        }
      }] : []),

      {
        $lookup: {
          from: "branches",
          localField: "office.branch_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "client_id",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $sort: { "cheques.due_date": 1 }
      }
    ]);

    // ✅ الشيكات المتأخرة
    const overdueMatchStage = {
      "cheques.due_date": { $lt: startOfMonth },
      "cheques.collected": false
    };

    const overdueCheques = await Booking.aggregate([
      { $unwind: "$cheques" },

      {
        $lookup: {
          from: "offices",
          localField: "office_id",
          foreignField: "_id",
          as: "office",
        },
      },
      { $unwind: "$office" },

      { $match: overdueMatchStage },

      ...(selectedBranch ? [{
        $match: {
          "office.branch_id": new mongoose.Types.ObjectId(selectedBranch)
        }
      }] : []),

      {
        $lookup: {
          from: "branches",
          localField: "office.branch_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "client_id",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $sort: { "cheques.due_date": 1 }
      }
    ]);

    // ✅ الحسابات
    let totalChequesAmount = 0;
    let collectedAmount = 0;

    cheques.forEach((c) => {
      const amount = c.cheques?.amount || 0;
      totalChequesAmount += amount;

      const paidAmount = (c.cheques.payments || []).reduce((sum, p) => sum + p.paid_amount, 0);
      if (paidAmount > 0) collectedAmount += paidAmount;
    });

    const remainingAmount = totalChequesAmount - collectedAmount;

    let totalOverdueAmount = 0;
    let overdueCollectedAmount = 0;

    overdueCheques.forEach((c) => {
      const amount = c.cheques?.amount || 0;
      totalOverdueAmount += amount;

      const paidAmount = (c.cheques.payments || []).reduce((sum, p) => sum + p.paid_amount, 0);
      if (paidAmount > 0) overdueCollectedAmount += paidAmount;
    });

    const overdueRemainingAmount = totalOverdueAmount - overdueCollectedAmount;

    console.log("✅ Total cheques:", cheques.length);
    console.log("💰 Total amount:", totalChequesAmount);
    console.log("✅ Collected amount:", collectedAmount);
    console.log("⏳ Remaining amount:", remainingAmount);
    console.log("⚠️ Overdue cheques:", overdueCheques.length);
    console.log("💰 Total overdue amount:", totalOverdueAmount);
    console.log("✅ Overdue Collected:", overdueCollectedAmount);
    console.log("⏳ Overdue Remaining:", overdueRemainingAmount);

    let branchName = "All Branches";
    if (selectedBranch) {
      const branchDoc = await Branch.findById(selectedBranch);
      if (branchDoc) branchName = branchDoc.name;
    } else if (cheques.length > 0 && cheques[0].branch && cheques[0].branch.length > 0) {
      branchName = cheques[0].branch[0].name || "Unknown Branch";
    }

    res.render("latestPayments", {
      cheques,
      overdueCheques,
      currentMonthName,
      selectedMonth,
      selectedYear,
      totalChequesAmount,
      collectedAmount,
      remainingAmount,
      totalOverdueAmount,
      overdueCollectedAmount,
      overdueRemainingAmount,
      branches,
      selectedBranch,
      branchName,
      user: req.user // لو هتستخدمه في الـ EJS
    });

  } catch (err) {
    console.error("❌ Error loading cheques:", err);
    res.status(500).send("Error loading cheques");
  }
});



module.exports = router;
