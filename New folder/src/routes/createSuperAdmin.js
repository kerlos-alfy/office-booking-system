// createSuperAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Role = require('../models/Role');
const User = require('../models/User');

async function createSuperAdmin() {
	await mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME'); // ← غيّر اسم قاعدة البيانات هنا

	const role = await Role.findOne({ name: 'super_admin' });
	if (!role) return console.log('❌ super_admin role not found. Run seedPermissions.js first.');

	const email = 'admin@example.com'; // ← غيّر الإيميل اللي تحبه
	const password = 'admin123'; // ← غيّر الباسورد

	const hashedPassword = await bcrypt.hash(password, 10);

	const exists = await User.findOne({ email });
	if (exists) {
		console.log('❌ User already exists.');
		process.exit();
	}

	const user = new User({
		email,
		password: hashedPassword,
		role: role._id,
	});

	await user.save();

	console.log(`✅ Super Admin created!\nEmail: ${email}\nPassword: ${password}`);
	process.exit();
}

createSuperAdmin();
// تأكد من تشغيل هذا السكربت مرة وحدة بعد ما تجهز قاعدة البيانات والأدوار
// لتجهيز السوبر أدمن. بعدين تقدر تحذف السكربت أو تعدل عليه حسب الحاجة.