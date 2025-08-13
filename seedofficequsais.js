require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 🧾 تحميل البيانات من ملف JSON
const dataPath = path.join(__dirname, 'seed_offices_al_qusais_cheques_35percent.json');
const offices = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// 🔌 الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  return mongoose.connection.db.collection('offices').insertMany(offices);
})
.then(result => {
  console.log(`📊 Total Offices Inserted: ${result.insertedCount}`);
})
.catch(err => {
  console.error('❌ Error inserting data:', err);
})
.finally(() => {
  mongoose.disconnect();
});
