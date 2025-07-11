const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	name: { type: String, required: true }, // ✅ الاسم هنا
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
	branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }
});

module.exports = mongoose.model('User', userSchema);
