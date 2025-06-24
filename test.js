// داخل ملف مؤقت مثلاً test.js
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb+srv://...your connection string...');

(async () => {
  const user = await User.findOne({ email: 'kero@kodeaa.com' }).populate({
    path: 'role',
    populate: { path: 'permissions', model: 'Permission' }
  });

  console.log(user.role.permissions); // المفروض يظهر Array فيه الكيز
  mongoose.disconnect();
})();
