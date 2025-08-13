// removeTwoInstallmentsForKaramah.js
require("dotenv").config();
const mongoose = require("mongoose");

process.on("unhandledRejection", (r) => console.error("🔴 UnhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("🔴 UncaughtException:", e));

const argv = process.argv.slice(2);
function getArg(name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}

const RAW_URI =
  getArg("--uri", null) ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/office-booking-system";

const DB_NAME = getArg("--db", process.env.DB_NAME || "office-booking-system");
const BRANCH_ID = getArg("--branch", process.env.BRANCH_ID || "68553d9a6131c797d5334501");
const TARGET_TYPE = getArg("--type", process.env.TARGET_TYPE || "two-installments");
const SHOULD_APPLY = argv.includes("--apply");
const DEBUG = argv.includes("--debug") || argv.includes("--verbose");
const OFFICE_COLL = getArg("--collection", process.env.OFFICE_COLL || "offices");

if (DEBUG) mongoose.set("debug", true);

console.log("🧾 Runtime:");
console.log("  Node:", process.version);
console.log("  Platform:", process.platform, process.arch);
console.log("  Mongoose:", mongoose.version);
console.log("  URI:", RAW_URI);
console.log("  DB Name:", DB_NAME);
console.log("  Collection:", OFFICE_COLL);
console.log("  Branch:", BRANCH_ID);
console.log("  Target Type:", TARGET_TYPE);
console.log("  Mode:", SHOULD_APPLY ? "APPLY (delete)" : "DRY RUN (no changes)");
console.log("---------------------------------------------------------");

mongoose.connection.on("connected", () => console.log("✅ Mongoose connected"));
mongoose.connection.on("error", (err) => console.error("❌ Mongoose error:", err.message));
mongoose.connection.on("disconnected", () => console.log("ℹ️ Mongoose disconnected"));

const paymentPlanSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    total_price: Number,
    down_payment: Number,
    number_of_cheques: Number,
  },
  { _id: false }
);

const officeSchema = new mongoose.Schema(
  {
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    office_number: String,
    payment_plans: [paymentPlanSchema],
  },
  { collection: OFFICE_COLL }
);

const Office = mongoose.model("Office", officeSchema);

function asObjectIdOrNull(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

(async () => {
  try {
    console.log("🔌 Connecting...");
    await mongoose.connect(RAW_URI, {
      serverSelectionTimeoutMS: 8000,
      dbName: DB_NAME,
    });

    const branchObj = asObjectIdOrNull(BRANCH_ID);

    // تأكد إن في مكاتب للفرع أصلًا
    const totalInBranch = await Office.countDocuments({
      $or: [{ branch_id: branchObj }, { branch_id: BRANCH_ID }],
    });
    console.log(`🧮 Offices in branch: ${totalInBranch}`);
    if (totalInBranch === 0) {
      console.log("⚠️ مفيش مكاتب بالفرع ده (تحقق من branch_id أو اسم الـ collection أو نوع الحقل).");
      return;
    }

    // عرض كل أنواع الدفع
    const typesAgg = await Office.aggregate([
      { $match: { $or: [{ branch_id: branchObj }, { branch_id: BRANCH_ID }] } },
      { $unwind: "$payment_plans" },
      { $group: { _id: "$payment_plans.type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    console.log("📊 payment_plans.type distribution:");
    if (typesAgg.length === 0) {
      console.log("  (لا توجد خطط دفع مسجلة في هذا الفرع)");
    } else {
      typesAgg.forEach((t) => console.log(`  - ${t._id}: ${t.count}`));
    }

    // المكاتب اللي فيها النوع المستهدف
    const officesWithTarget = await Office.find({
      $or: [{ branch_id: branchObj }, { branch_id: BRANCH_ID }],
      "payment_plans.type": TARGET_TYPE,
    })
      .select({ office_number: 1, payment_plans: 1 })
      .lean();

    console.log(`\n🔎 Offices having "${TARGET_TYPE}": ${officesWithTarget.length}`);
    officesWithTarget.forEach((o) => {
      const plans = (o.payment_plans || []).filter((p) => p.type === TARGET_TYPE);
      console.log(`  🏢 ${o.office_number || o._id} -> ${plans.length} plan(s)`);
    });

    if (!SHOULD_APPLY) {
      console.log("\n🧪 DRY RUN — لم يتم حذف أي شيء.");
      console.log('للتنفيذ: node removeTwoInstallmentsForKaramah.js --apply');
      console.log('تغيير الاسم: --type two_installments');
      console.log('تغيير الفرع: --branch <id>');
      console.log('تغيير الكولكشن: --collection offices_v2');
      console.log('تغيير الـ URI: --uri "mongodb+srv://user:pass@host/db"');
      return;
    }

    if (officesWithTarget.length === 0) {
      console.log("ℹ️ لا يوجد ما يُحذف بالاسم الحالي. راجع التوزيع بالأعلى لتحديد الاسم الصحيح.");
      return;
    }

    console.log("\n⚠️ Applying delete...");
    const res = await Office.updateMany(
      { $or: [{ branch_id: branchObj }, { branch_id: BRANCH_ID }] },
      { $pull: { payment_plans: { type: TARGET_TYPE } } }
    );

    console.log("🧹 Done.");
    console.log(`📦 Matched: ${res.matchedCount ?? res.nMatched}`);
    console.log(`✂️ Modified: ${res.modifiedCount ?? res.nModified}`);

    const left = await Office.countDocuments({
      $or: [{ branch_id: branchObj }, { branch_id: BRANCH_ID }],
      "payment_plans.type": TARGET_TYPE,
    });
    console.log(`✅ Final check: remaining offices with "${TARGET_TYPE}": ${left}`);
  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    await mongoose.disconnect();
  }
})();
