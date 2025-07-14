require('dotenv').config();
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true }
});

const Permission = mongoose.model('Permission', permissionSchema);

const newPermissions = [
  { key: 'branches.view', name: 'View Branches' },
  { key: 'branches.create', name: 'Create Branch' },
  { key: 'branches.update', name: 'Update Branch' },
  { key: 'branches.delete', name: 'Delete Branch' },

  { key: 'bookings.view', name: 'View Bookings' },
  { key: 'bookings.create', name: 'Create Booking' },
  { key: 'bookings.update', name: 'Update Booking' },
  { key: 'bookings.cancel', name: 'Cancel Booking' },

  { key: 'contracts.view', name: 'View Contracts' },
  { key: 'contracts.create', name: 'Create Contract' },
  { key: 'contracts.update', name: 'Update Contract' },
  { key: 'contracts.download', name: 'Download Contract' },

  { key: 'payments.view', name: 'View Payments' },
  { key: 'payments.add', name: 'Add Payment' },
  { key: 'payments.update', name: 'Update Payment' },
  { key: 'payments.mark_as_paid', name: 'Mark Payment as Paid' },

  { key: 'reports.export', name: 'Export Reports' },

  { key: 'logs.export', name: 'Export Logs' },

  { key: 'settings.view', name: 'View Settings' },
  { key: 'settings.update', name: 'Update Settings' },
];

async function seedPermissions() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'test' });

  for (let perm of newPermissions) {
    const exists = await Permission.findOne({ key: perm.key });
    if (!exists) {
      await Permission.create(perm);
      console.log(`✅ Added: ${perm.key}`);
    } else {
      console.log(`ℹ️ Already exists: ${perm.key}`);
    }
  }

  console.log('🚀 Done!');
  mongoose.connection.close();
}

seedPermissions().catch(err => console.error(err));
