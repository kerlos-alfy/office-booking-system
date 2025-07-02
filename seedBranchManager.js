require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Permission = require('./src/models/Permission');
const Role = require('./src/models/Role');
const Branch = require('./src/models/Branch');
const User = require('./src/models/User');

// ✅ تأكد إن اتصال DB شغال
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ DB Connection Error:', err));

async function seedBranchManager() {
  try {
    // 1️⃣ أضف الصلاحية branch_manager
    let permission = await Permission.findOne({ key: 'branch_manager' });
    if (!permission) {
      permission = await Permission.create({
        name: 'مدير فرع',
        key: 'branch_manager'
      });
      console.log('✅ Created Permission:', permission);
    }

    // 2️⃣ أنشئ الدور Branch Manager
    let role = await Role.findOne({ name: 'Branch Manager' });
    if (!role) {
      role = await Role.create({
        name: 'Branch Manager',
        permissions: [permission._id]
      });
      console.log('✅ Created Role:', role);
    }

    // 3️⃣ أنشئ فرع تجريبي
    let branch = await Branch.findOne({ name: 'Test Branch' });
    if (!branch) {
      branch = await Branch.create({
        name: 'Test Branch',
        location: 'Downtown'
      });
      console.log('✅ Created Branch:', branch);
    }

    // 4️⃣ أنشئ يوزر مدير فرع مربوط بالفرع ده
    const hashedPassword = await bcrypt.hash('123456', 12);

    let user = await User.findOne({ email: 'branchmanager@test.com' });
    if (!user) {
      user = await User.create({
        name: 'Branch Manager User',
        email: 'branchmanager@test.com',
        password: hashedPassword,
        role: role._id,
        branch: branch._id
      });
      console.log('✅ Created User:', user);
    }

    console.log('\n🚀 Done! سجل دخولك بالإيميل: branchmanager@test.com والباسورد: 123456');
    console.log('👀 هتلاقي التوكن بيحتوي على permission branch_manager + بيانات الفرع.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

seedBranchManager();
