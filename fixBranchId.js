require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const correctBranchId = new ObjectId("68553e016131c797d5334507");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;

    // فلترة كل المكاتب اللي مخزنين branch_id كـ كائن { $oid: ... } بدلاً من ObjectId فعلي
    const result = await db.collection('offices').updateMany(
      { "branch_id.$oid": "68553e016131c797d5334507" }, // ✅ الطريقة الصح
      { $set: { branch_id: correctBranchId } }
    );

    console.log(`✅ Updated ${result.modifiedCount} offices`);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error connecting to MongoDB:', err);
  });
