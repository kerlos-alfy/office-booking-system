require('dotenv').config(); // ⬅️ لتحميل .env

const mongoose = require('mongoose');
const Permission = require('../src/models/Permission'); // عدله لو المسار مختلف

const permissions = [
  { key: 'add_admins', name: 'Manage Users' },
  { key: 'manage_roles', name: 'Manage Roles & Permissions' },
  { key: 'view_reports', name: 'View Reports' },
  { key: 'manage_bookings', name: 'Manage Bookings' },
  { key: 'manage_offices', name: 'Manage Offices' },
  { key: 'manage_clients', name: 'Manage Clients' },
  { key: 'manage_payments', name: 'Manage Payments' },
  { key: 'view_dashboard', name: 'View Dashboard' },
  { key: 'access_finance', name: 'Access Financial Reports' },
];

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('🟢 Connected to MongoDB');

  await Permission.deleteMany(); // optional: clear old permissions
  await Permission.insertMany(permissions);

  console.log('✅ Permissions seeded successfully');
  mongoose.disconnect();
}).catch(err => {
  console.error('❌ Error connecting to MongoDB:', err);
});
