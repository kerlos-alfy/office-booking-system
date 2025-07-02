const mongoose = require("mongoose");

const paymentPlanSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["single", "two-installments", "cheques"],
    required: true,
  },
  total_price: {
    type: Number,
    required: true,
  },
  down_payment: Number, // فقط للطريقة التالتة
  number_of_cheques: Number, // فقط للطريقة التالتة
});

const officeSchema = new mongoose.Schema(
  {
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    office_number: { type: String, required: true },
    monthly_price: { type: Number, required: true },
    yearly_price: { type: Number, required: true },
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

    main_image: {
      type: String,
      default: null,
    },

    gallery: {
      type: [String],
      default: [],
    },

    image_folder: { type: String },

    // 🟢 خطط الدفع
    payment_plans: [paymentPlanSchema],
  },
  {
    timestamps: true,
  }
);

const Office = mongoose.model("Office", officeSchema);

module.exports = Office;
