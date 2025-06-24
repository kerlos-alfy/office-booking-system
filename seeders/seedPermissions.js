// seedPermissions.js
require('dotenv').config(); // 🟢 لازم أول سطر

const mongoose = require('mongoose');
const Permission = require('../src/models/Permission'); // تأكد من المسار الصحيح
const Role = require('../src/models/Role');

const permissions = [
	{ key: 'view_branches', label: 'View Branches' },
	{ key: 'edit_branches', label: 'Edit Branches' },
	{ key: 'add_admins', label: 'Add Admins' },
	{ key: 'manage_roles', label: 'Manage Roles & Permissions' },
	{ key: 'view_reports', label: 'View Financial Reports' },
	{ key: 'edit_bookings', label: 'Edit Bookings' },
];

async function seed() {
	await mongoose.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	await Permission.deleteMany();
	await Role.deleteMany();

	const insertedPerms = await Permission.insertMany(permissions);

	const superAdminRole = new Role({
		name: 'super_admin',
		permissions: insertedPerms.map(p => p._id),
	});
	await superAdminRole.save();

	console.log('✅ Permissions and Super Admin Role created!');
	process.exit();
}

seed();