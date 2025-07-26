require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// ⛓️ الاتصال من ملف env
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Connected to MongoDB.");
}).catch(err => {
  console.error("❌ Connection Error:", err);
});

// ✅ Schema
const officeSchema = new mongoose.Schema({
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  office_number: { type: String, required: true },
  floor: { type: String, required: true },
  size_category: {
    type: String,
    enum: ["100-120", "120-150", "150-200", "200-250", "300-400"],
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "booked", "archived"],
    default: "available",
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    default: null,
  },
  main_image: String,
  gallery: [String],
  image_folder: String,
  payment_plans: [
    {
      type: {
        type: String,
        enum: ["single", "two-installments", "cheques"],
        required: true,
      },
      total_price: { type: Number, required: true },
      down_payment: Number,
      number_of_cheques: Number,
    },
  ],
}, { timestamps: true });

const Office = mongoose.model("Office", officeSchema);

// 📥 قراءة البيانات من الملف
const dataPath = path.join(__dirname, "offices_naif_seeder_auto_id.json");
const officeData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// 🧨 Seed
Office.insertMany(officeData)
  .then(() => {
    console.log("✅ Data seeded successfully.");
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("❌ Seeding failed:", err);
    mongoose.connection.close();
  });
