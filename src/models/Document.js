const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  file_url: { type: String, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  uploaded_at: { type: Date, default: Date.now },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Document', documentSchema);
