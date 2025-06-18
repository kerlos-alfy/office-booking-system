const mongoose = require("mongoose");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const Branch = require("../models/Branch");
const Office = require("../models/Office");
const Client = require("../models/Client");
const Booking = require("../models/Booking");

const branchesPath = path.join(__dirname, "seed-data", "branches.json");
const officesPath = path.join(__dirname, "seed-data", "offices.json");
const clientsPath = path.join(__dirname, "seed-data", "clients.json");
const paymentsPath = path.join(__dirname, "seed-data", "payments.json");

mongoose.connect(process.env.MONGO_URI).then(async () => {
	console.log("✅ Connected to MongoDB – Starting Seeding");

	// Clear existing data
	await Branch.deleteMany();
	await Office.deleteMany();
	await Client.deleteMany();
	await Booking.deleteMany();

	// Read data
	const branchesData = JSON.parse(fs.readFileSync(branchesPath, "utf-8"));
	const officesDataRaw = JSON.parse(fs.readFileSync(officesPath, "utf-8"));
	const clientsData = JSON.parse(fs.readFileSync(clientsPath, "utf-8"));
	const paymentsData = JSON.parse(fs.readFileSync(paymentsPath, "utf-8"));

	// Insert branches
	const branches = await Branch.insertMany(branchesData);
	console.log(`✅ Created ${branches.length} branches`);

	// Validate and insert offices
	const officesData = officesDataRaw
		.filter((o) => typeof o.branchIndex === "number" && o.branchIndex < branches.length)
		.map((o) => ({
			branch_id: branches[o.branchIndex]._id,
			office_number: o.office_number,
			floor: o.floor,
			monthly_price: o.monthly_price,
			yearly_price: o.yearly_price,
		}));

	const allOffices = await Office.insertMany(officesData);
	console.log(`✅ Created ${allOffices.length} offices`);

	// Insert clients
	const clients = await Client.insertMany(clientsData);
	console.log(`✅ Inserted ${clients.length} clients`);

	// Insert bookings
	const today = new Date();
	const bookingsData = [];

	for (let i = 0; i < allOffices.length; i++) {
		if (i % 2 === 0) {
			const randomClient = clients[Math.floor(Math.random() * clients.length)];
			const randomPayments = [paymentsData[Math.floor(Math.random() * paymentsData.length)]];

			bookingsData.push({
				office_id: allOffices[i]._id,
				client_id: randomClient._id,
				start_date: today,
				end_date: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()),
				contract_type: "monthly",
				initial_payment: randomPayments[0].amount,
				total_price: 3000,
				ejari_no: randomClient.ejari_no || `EJ-${Math.floor(Math.random() * 10000000000)}`,
				commission: 300,
				admin_fee: 200,
				sec_deposit: 1000,
				vat: 150,
				page_no: i + 1,
				payments: randomPayments,
			});
		}
	}

	await Booking.insertMany(bookingsData);
	console.log(`✅ Inserted ${bookingsData.length} bookings`);

	console.log("✅ Seeding Completed.");
	mongoose.connection.close();
});
