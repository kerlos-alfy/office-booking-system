const mongoose = require('mongoose');
require('dotenv').config();

const Branch = require('../models/Branch');
const Office = require('../models/Office');
const Client = require('../models/Client');
const Booking = require('../models/Booking');

async function clearDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB');
        console.log('🧹 Clearing collections...');

        const [branches, offices, clients, bookings] = await Promise.all([
            Branch.deleteMany(),
            Office.deleteMany(),
            Client.deleteMany(),
            Booking.deleteMany()
        ]);

        console.log(`🗑️ Branches removed: ${branches.deletedCount}`);
        console.log(`🗑️ Offices removed: ${offices.deletedCount}`);
        console.log(`🗑️ Clients removed: ${clients.deletedCount}`);
        console.log(`🗑️ Bookings removed: ${bookings.deletedCount}`);

        console.log('✅ All data cleared successfully.');
        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
