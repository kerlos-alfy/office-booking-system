// ✅ تحميل المتغيرات من .env
require("dotenv").config();

// ✅ استدعاء المكتبات
const mongoose = require("mongoose");
const Office = require("./src/models/Office"); // ✏️ عدل المسار حسب مكان موديل Office
const newOffices = require("./offices_cleaned_for_seeding.json"); // ✏️ عدل لو الملف في مكان تاني

// ✅ متغير الاتصال
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set in .env file");
  process.exit(1);
}

async function seedOffices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    let added = 0;
    let skipped = 0;

    for (const office of newOffices) {
      // ✅ تحقق إن المكتب مش مكرر (بنفس الفرع + رقم المكتب)
      const exists = await Office.findOne({
        branch_id: office.branch_id,
        office_number: office.office_number,
      });

      if (exists) {
        console.log(`⛔ Office ${office.office_number} already exists in branch ${office.branch_id}. Skipped.`);
        skipped++;
        continue;
      }

      await Office.create(office);
      console.log(`✅ Office ${office.office_number} added successfully.`);
      added++;
    }

    console.log("\n🎯 Summary:");
    console.log(`➡️ Total processed: ${newOffices.length}`);
    console.log(`✅ Added: ${added}`);
    console.log(`⛔ Skipped (duplicates): ${skipped}`);
  } catch (err) {
    console.error("❌ Error during seeding:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seedOffices();
