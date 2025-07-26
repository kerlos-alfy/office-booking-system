const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Branch = require('../models/Branch');
const { authenticateJWT } = require("../middlewares/auth");

const router = express.Router();

const baseDir = path.join(__dirname, '..', 'public', 'uploads', 'documents', 'all');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(baseDir, { recursive: true });
    cb(null, baseDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


// ✅ عرض المستندات كلها بفرع
router.get('/admin/documents', authenticateJWT, async (req, res) => {
  try {
    const branches = await Branch.find().sort('name');
    const docs = await Document.find().populate('branch').sort({ uploaded_at: -1 });

    res.render('documents', {
      user: req.user,
      docs,
      branches
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading documents');
  }
});


// ✅ رفع مستند
router.post('/admin/documents/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const { title, branch } = req.body;

    if (!req.file) {
      return res.status(400).send('No file uploaded!');
    }

    const file_url = '/uploads/documents/all/' + req.file.filename;

    const newDoc = new Document({
      title,
      file_url,
      branch,
      uploaded_by: req.user ? req.user._id : null
    });

    await newDoc.save();
    res.redirect('/admin/documents');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error uploading document');
  }
});


// ✅ حذف مستند
router.post('/admin/documents/delete/:id', authenticateJWT, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (doc) {
      const filePath = path.join(
        __dirname,
        '..',
        'public',
        'uploads',
        'documents',
        'all',
        path.basename(doc.file_url)
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await Document.findByIdAndDelete(req.params.id);
    }
    res.redirect('/admin/documents');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting document');
  }
});

module.exports = router;
