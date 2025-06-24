require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const Role = require('./src/models/Role');

async function createSuperAdmin() {
	console.log('🔄 Connecting to MongoDB...');
	await mongoose.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
	console.log('✅ Connected!');

	const email = 'kero@kodeaa.com';
	const password = '012111';

	console.log('🔎 Looking for super_admin role...');
	const role = await Role.findOne({ name: 'super_admin' });
	if (!role) {
		console.log('❌ super_admin role not found. Run seedPermissions.js first.');
		process.exit();
	}

	console.log('🔍 Checking if user already exists...');
	const exists = await User.findOne({ email });
	if (exists) {
		console.log('❌ هذا الإيميل مسجل بالفعل.');
		process.exit();
	}

	console.log('🔐 Hashing password...');
	const hashedPassword = await bcrypt.hash(password, 10);

	console.log('👤 Creating user...');
	const user = new User({
		email,
		password: hashedPassword,
		role: role._id,
	});

	await user.save();
	console.log(`✅ Super Admin Created:
Email: ${email}
Password: ${password}`);
	process.exit();
}

createSuperAdmin();
