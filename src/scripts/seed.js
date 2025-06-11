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
    console.log('✅ MongoDB connected — Seeding...');

    // مسح القديم (لو حابب تبدأ من الصفر)
    await Branch.deleteMany();
    await Office.deleteMany();
    await Client.deleteMany();
    await Booking.deleteMany();

    // اضافة 4 فروع
    const branchesData = [
        { name: 'Branch A', location: 'Location A' },
        { name: 'Branch B', location: 'Location B' },
        { name: 'Branch C', location: 'Location C' },
        { name: 'Branch D', location: 'Location D' },
    ];

    const branches = await Branch.insertMany(branchesData);
    console.log(`✅ Inserted ${branches.length} branches`);

    // اضافة مكاتب لكل فرع
    let allOffices = [];
    for (const branch of branches) {
        let officesData = [];
        for (let i = 1; i <= 10; i++) {
           officesData.push({
        branch_id: branch._id,
        office_number: `#${i}`,
        floor: Math.ceil(i / 3), // مثال: كل 3 Offices في Floor
        monthly_price: 500 + i * 10,
        yearly_price: 5000 + i * 100
    });
        }
        const offices = await Office.insertMany(officesData);
        console.log(`✅ Inserted ${offices.length} offices for branch ${branch.name}`);
        allOffices = allOffices.concat(offices); // نجمعهم علشان نستخدمهم في Bookings
    }

    // اضافة عملاء
    const clientsData = [];
    for (let i = 1; i <= 10; i++) {
        clientsData.push({
            name: `Client ${i}`,
            phone: `+20100${i}0000${i}`,
            email: `client${i}@example.com`
        });
    }

    const clients = await Client.insertMany(clientsData);
    console.log(`✅ Inserted ${clients.length} clients`);

    // ✅ اضافة حجوزات وهمية
    let bookingsData = [];
    const today = new Date();

    for (let i = 0; i < allOffices.length; i++) {
        // نحجز مثلا كل مكتب رقم %4 == 0 → كل 4 مكاتب نحجز واحد
        if (i % 4 === 0) {
            const office = allOffices[i];
            const randomClient = clients[Math.floor(Math.random() * clients.length)];

            bookingsData.push({
                office_id: office._id,
                client_id: randomClient._id,
                start_date: today,
                end_date: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()), // +1 شهر
                contract_type: 'monthly',
                initial_payment: 500,
                total_price: 1500,
                payments: [
                    {
                        amount: 500,
                        payment_date: today,
                        payment_type: 'initial'
                    }
                ]
            });
        }
    }

    const bookings = await Booking.insertMany(bookingsData);
    console.log(`✅ Inserted ${bookings.length} bookings`);

    console.log('✅ Seeding completed.');
    mongoose.connection.close();
});
