const mongoose = require('mongoose');
require('dotenv').config();

const Branch = require('../models/Branch');
const Office = require('../models/Office');
const Client = require('../models/Client');
const Booking = require('../models/Booking');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ MongoDB connected — Clearing...');

    await Branch.deleteMany();
    await Office.deleteMany();
    await Client.deleteMany();
    await Booking.deleteMany();

    console.log('✅ All data cleared.');
    mongoose.connection.close();
});
