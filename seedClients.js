require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ✅ سكيمــا العميل
const clientSchema = new mongoose.Schema({
  mobile: { type: String, required: true },

  // Company Name
  company_en: { type: String, required: true },
  company_ar: { type: String },

  // Registered Owner Name
  registered_owner_name_en: { type: String },
  registered_owner_name_ar: { type: String },

  // Nationality
  nationality_en: { type: String },
  nationality_ar: { type: String },

  // License Info
  license_number: { type: String },
  license_expiry: { type: Date },

  // New Fields
  trn: { type: String }, // الرقم الضريبي
  email: { type: String }, // الإيميل

  emirates_id_status: { type: String, enum: ['OK', 'NOT NEED', 'UNAVAILABLE'], required: true },
  contract_status: { type: String, enum: ['OK', 'NO'], required: true },
  license_status: { type: String, enum: ['OK', 'NO'], required: true },
  ejari_no: { type: Number },

  license_file_path: { type: String },
  ejari_file_path: { type: String },
  emirates_id_file_path: { type: String },
  passport_file_path: { type: String },
  contract_file_path: { type: String },
  additional_files: [String]
}, {
  timestamps: true
});

const Client = mongoose.model('Client', clientSchema);

// ✅ Seeder Function
async function seedClients() {
  const startTime = new Date();
  console.log(chalk.blueBright(`🚀 Starting client seeder at ${startTime.toLocaleString()}`));

  try {
    const mongoUri = process.env.MONGO_URI;

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(chalk.green("✅ Connected to MongoDB Atlas"));

    const filePath = path.join(__dirname, 'clients_seed_data_final_cleaned.json');


    const rawData = fs.readFileSync(filePath, 'utf-8');
    const clients = JSON.parse(rawData);

    // Optional: Uncomment to clear previous data
    // await Client.deleteMany({});

    const inserted = await Client.insertMany(clients);
    console.log(chalk.yellow(`📊 Total Clients Inserted: ${inserted.length}`));

    await mongoose.disconnect();
    const endTime = new Date();
    console.log(chalk.green(`✅ Finished at ${endTime.toLocaleString()}`));
    console.log(chalk.magenta(`⏱️ Duration: ${(endTime - startTime) / 1000}s`));
    console.log(chalk.bold.greenBright('🎉 Seeding complete!'));
  } catch (err) {
    console.error(chalk.red.bold("❌ Error during seeding:"), err.message);
    process.exit(1);
  }
}

seedClients();
