const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Role = require('../src/models/Role'); // تأكد من المسار الصحيح
const Permission = require('../src/models/Permission');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const role = await Role.findOne({ name: 'super_admin' });
    const permissions = await Permission.find();

    if (!role) {
      console.log('❌ No super_admin role found');
      return process.exit(0);
    }

    if (!permissions.length) {
      console.log('❌ No permissions found in database');
      return process.exit(0);
    }

    role.permissions = permissions.map(p => p._id);
    await role.save();

    console.log(`✅ Assigned ${permissions.length} permissions to super_admin`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    mongoose.disconnect();
  }
});
