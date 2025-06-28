const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const Office = require("./models/Office");
const Client = require("./models/Client");

mongoose
  .connect("mongodb://localhost:27017/office-booking-system")
  .then(async () => {
    console.log("✅ Connected");

    const office = await Office.findOne({ status: "available" });
    const client = await Client.findOne();

    if (!office || !client) {
      console.log("❌ Office or Client not found");
      return mongoose.disconnect();
    }

    const booking = new Booking({
      office_id: office._id,
      client_id: client._id,
      page_no: "TEST123",
      start_date: new Date(),
      end_date: new Date(new Date().getFullYear(), new Date().getMonth(), 28),
      initial_payment: 500,
      total_price: 5000,
      vat: 250,
      sec_deposit: 1000,
      admin_fee: 200,
      commission: 300,
      ejari_no: "EJARI-TEST",
      payments: [{ amount: 500, payment_type: "initial", payment_date: new Date() }],
      status: "active",
      cheques: [],
    });

    await booking.save();

    await Office.findByIdAndUpdate(office._id, {
      status: "booked",
      currentBooking: booking._id,
    });

    console.log(`✅ Test booking created: ${booking._id}`);
    mongoose.disconnect();
  })
  .catch((err) => console.error("❌ Connection Error", err));
