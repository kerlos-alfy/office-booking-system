const mongoose = require("mongoose");
require("dotenv").config();

require("./src/models/Client");
require("./src/models/Office");
const Booking = require("./src/models/Booking");

async function checkDuplicateChequeAmounts() {
  await mongoose.connect(process.env.MONGO_URI);

  const bookings = await Booking.find()
    .populate("client_id")
    .populate("office_id");

  const map = {};

  for (const booking of bookings) {
    for (const cheque of booking.cheques || []) {
      const amount = cheque.amount;

      if (!amount) continue;

      const key = String(amount);
      if (!map[key]) map[key] = [];
      map[key].push({
        bookingId: booking._id,
        office: booking.office_id?.office_number || "N/A",
        client:
          booking.client_id?.company_en || booking.client_id?.company_name || "N/A",
      });
    }
  }

  let found = false;
  for (const [amount, list] of Object.entries(map)) {
    if (list.length > 1) {
      found = true;
      console.log(`\n🔁 Cheque Amount ${amount} AED used in ${list.length} bookings:`);
      list.forEach((item, i) => {
        console.log(
          ` ${i + 1}. Booking ID: ${item.bookingId} | Office: ${item.office} | Client: ${item.client}`
        );
      });
    }
  }

  if (!found) {
    console.log("✅ مفيش أي مبلغ شيك مكرر بين الحجوزات.");
  }

  mongoose.connection.close();
}

checkDuplicateChequeAmounts();
