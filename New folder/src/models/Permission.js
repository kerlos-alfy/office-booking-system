const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Permission', permissionSchema);
