const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = req.clientFolderName || "default"; // في حالة حصل خطأ

    // ✅ نخزن في: public/uploads/clients/<folderName>
    const uploadPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'clients', folderName);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    cb(null, true);
  }
});

module.exports = upload;
