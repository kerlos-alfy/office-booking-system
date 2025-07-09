const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

// ✅ صفحة شيكات الشهر + المتأخر من الشهور السابقة مع Totals كاملة
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const selectedMonth = req.query.month ? parseInt(req.query.month) : now.getMonth();
    const selectedYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const currentMonthName = `${monthNames[selectedMonth]} ${selectedYear}`;

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 1);

    console.log("🟢 Selected:", selectedMonth, selectedYear);
    console.log("🟢 Range:", startOfMonth.toISOString(), "-", endOfMonth.toISOString());

    // ✅ شيكات الشهر الحالي
    const cheques = await Booking.aggregate([
      { $unwind: "$cheques" },
      {
        $match: {
          "cheques.due_date": { $gte: startOfMonth, $lt: endOfMonth }
        }
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
        $lookup: {
          from: "offices",
          localField: "office_id",
          foreignField: "_id",
          as: "office",
        },
      },
      {
        $sort: { "cheques.due_date": 1 }
      }
    ]);

    // ✅ الشيكات المتأخرة (قبل بداية الشهر الحالي ولم تتحصل بالكامل)
    const overdueCheques = await Booking.aggregate([
      { $unwind: "$cheques" },
      {
        $match: {
          "cheques.due_date": { $lt: startOfMonth },
          "cheques.collected": false
        }
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
        $lookup: {
          from: "offices",
          localField: "office_id",
          foreignField: "_id",
          as: "office",
        },
      },
      {
        $sort: { "cheques.due_date": 1 }
      }
    ]);

    // ✅ احسب الإجماليات مع الشرط الصح للجزئي
    let totalChequesAmount = 0;
    let collectedAmount = 0;

    cheques.forEach((c) => {
      const amount = c.cheques?.amount || 0;
      totalChequesAmount += amount;

      const paidAmount = (c.cheques.payments || []).reduce((sum, p) => sum + p.paid_amount, 0);

      // ✅ لو فيه أي مبلغ مدفوع يتحسب حتى لو الشيك Pending
      if (paidAmount > 0) {
        collectedAmount += paidAmount;
      }
    });

    const remainingAmount = totalChequesAmount - collectedAmount;

    // ✅ المتأخرات بنفس المبدأ
    let totalOverdueAmount = 0;
    let overdueCollectedAmount = 0;

    overdueCheques.forEach((c) => {
      const amount = c.cheques?.amount || 0;
      totalOverdueAmount += amount;

      const paidAmount = (c.cheques.payments || []).reduce((sum, p) => sum + p.paid_amount, 0);

      if (paidAmount > 0) {
        overdueCollectedAmount += paidAmount;
      }
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
      overdueRemainingAmount
    });

  } catch (err) {
    console.error("❌ Error loading cheques:", err);
    res.status(500).send("Error loading cheques");
  }
});

module.exports = router;
