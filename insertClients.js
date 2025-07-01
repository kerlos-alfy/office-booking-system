require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const clientSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  company_en: { type: String, required: true },
  company_ar: String,
  license_number: String,
  license_expiry: Date,
  email: String,
  emirates_id_status: { type: String, enum: ['OK', 'NOT NEED', 'UNAVAILABLE'] },
  contract_status: { type: String, enum: ['OK', 'NO'] },
  license_status: { type: String, enum: ['OK', 'NO'] },
  ejari_no: Number
});

const Client = mongoose.model('Client', clientSchema);

const rawData = fs.readFileSync('./clients_fixed_ejari_default.json');
const clientsData = JSON.parse(rawData);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // ⚡️ فلترة الـ records عشان تتفادى الخطأ
    const validClients = clientsData.filter(c => c.mobile && typeof c.mobile === 'string');
    console.log(`✅ Valid clients: ${validClients.length}`);
    console.log(`❌ Removed: ${clientsData.length - validClients.length} records with missing mobile.`);

    const result = await Client.insertMany(validClients);
    console.log(`✅ Inserted ${result.length} clients.`);

    mongoose.disconnect();
    console.log('✅ Disconnected.');
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
