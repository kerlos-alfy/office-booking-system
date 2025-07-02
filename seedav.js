require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Permission = require('./src/models/Permission');
const Role = require('./src/models/Role');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ DB Connection Error:', err));

async function seedAll() {
  try {
    // ✅ 1) أضف كل الصلاحيات الأساسية
    const permissionsKeys = [
      'manage_roles',
      'add_admins',
      'view_reports',
      'manage_users',
      'manage_offices',
      'view_logs',
      'manage_permissions',
      'branch_manager'
    ];

    const permissionDocs = [];
    for (const key of permissionsKeys) {
      let permission = await Permission.findOne({ key });
      if (!permission) {
        permission = await Permission.create({
          name: key.replace(/_/g, ' ').toUpperCase(),
          key: key
        });
        console.log(`✅ Created Permission: ${key}`);
      } else {
        console.log(`ℹ️ Permission exists: ${key}`);
      }
      permissionDocs.push(permission);
    }

    // ✅ 2) أضف Super Admin Role (فاضي لأنه بياخد كل الصلاحيات وقت التوكن)
    let superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'Super Admin',
        permissions: [] // بياخد كل الصلاحيات تلقائيًا وقت الـ Login
      });
      console.log('✅ Created Role: Super Admin');
    } else {
      console.log('ℹ️ Role exists: Super Admin');
    }

    // ✅ 3) أضف Branch Manager Role مربوط بـ branch_manager فقط
    const branchManagerPermission = permissionDocs.find(p => p.key === 'branch_manager');
    let branchManagerRole = await Role.findOne({ name: 'Branch Manager' });
    if (!branchManagerRole) {
      branchManagerRole = await Role.create({
        name: 'Branch Manager',
        permissions: [branchManagerPermission._id]
      });
      console.log('✅ Created Role: Branch Manager');
    } else {
      console.log('ℹ️ Role exists: Branch Manager');
    }

    // ✅ 4) أضف Super Admin User
    const superAdminPassword = await bcrypt.hash('1234', 12);
    let superAdminUser = await User.findOne({ email: 'kero@kero.com' });
    if (!superAdminUser) {
      superAdminUser = await User.create({
        name: 'Kero Super Admin',
        email: 'kero@kero.com',
        password: superAdminPassword,
        role: superAdminRole._id
      });
      console.log('✅ Created User: kero@kero.com');
    } else {
      console.log('ℹ️ User exists: kero@kero.com');
    }

    // ✅ 5) أضف Branch Manager User بدون فرع (إنت هتربطه يدوي بعدين)
    const branchManagerPassword = await bcrypt.hash('1234', 12);
    let branchManagerUser = await User.findOne({ email: 'kero1@kero.com' });
    if (!branchManagerUser) {
      branchManagerUser = await User.create({
        name: 'Kero Branch Manager',
        email: 'kero1@kero.com',
        password: branchManagerPassword,
        role: branchManagerRole._id,
        branch: null // إنت هتربطه يدوي بعدين
      });
      console.log('✅ Created User: kero1@kero.com');
    } else {
      console.log('ℹ️ User exists: kero1@kero.com');
    }

    console.log('\n🚀 Done!');
    console.log('🧑‍💻 Super Admin Email: kero@kero.com | Password: 1234');
    console.log('🧑‍💻 Branch Manager Email: kero1@kero.com | Password: 1234');
    console.log('📌 الفرع مش مرتبط هنا — إنت هتربطه يدوي في DB لما تعمل فروعك.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

seedAll();
