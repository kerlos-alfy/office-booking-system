const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema(
  {
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    office_number: { type: String, required: true },
    monthly_price: { type: Number, required: true },
    yearly_price: { type: Number, required: true },
    floor: { type: String, required: true },

   

    // 🟢 التصنيف حسب المساحة (للعرض)
    size_category: {
      type: String,
      enum: ["100-120", "120-150", "150-200", "200-250"],
      required: true,
    },

    // 🟢 الحالة الحالية للمكتب
    status: {
      type: String,
      enum: ["available", "booked", "archived"],
      default: "available",
    },

    // 🟢 الحجز الحالي إن وُجد
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

  },
  {
    timestamps: true,
  }
);

const Office = mongoose.model("Office", officeSchema);

module.exports = Office;
