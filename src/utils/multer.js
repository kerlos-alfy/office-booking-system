// utils/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const clientId = req.params.clientId;

        // Target path → /uploads/clients/CLIENT_ID
        const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'clients', clientId);

        // Create the folder if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        // Example: license_file-17182122344.pdf
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);

        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Multer Instance
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Optional: limit files to 10MB
    },
    fileFilter: function (req, file, cb) {
        // Accept all files (you can customize)
        cb(null, true);
    }
});

module.exports = upload;
