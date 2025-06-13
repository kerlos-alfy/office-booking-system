const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const upload = require('../utils/multer');

// View all clients
router.get('/', async (req, res) => {
    try {
        const clients = await Client.find();
        res.render('clients', { clients });
    } catch (err) {
        res.status(500).send('Error loading clients');
    }
});

// New Client Form
router.get('/new', (req, res) => {
    res.render('newClient');
});

// Save new client
router.post('/new', async (req, res) => {
    try {
        const {
            mobile,
            company,
            registered_owner_name,
            nationality,
            emirates_id_status,
            contract_status,
            license_status,
            ejari_no
        } = req.body;

        const client = new Client({
            mobile,
            company,
            registered_owner_name,
            nationality,
            emirates_id_status,
            contract_status,
            license_status,
            ejari_no
        });

        await client.save();

        res.redirect('/clients');
    } catch (err) {
        res.status(500).send('Error saving client');
    }
});

// Upload Page
router.get('/:clientId/upload', async (req, res) => {
    try {
        const client = await Client.findById(req.params.clientId);
        if (!client) {
            return res.status(404).send('Client not found');
        }

        res.render('clientUpload', { client });
    } catch (err) {
        res.status(500).send('Error loading upload page');
    }
});

// Upload POST
router.post('/:clientId/upload',upload.fields([
    { name: 'license_file', maxCount: 1 },
    { name: 'ejari_file', maxCount: 1 },
    { name: 'emirates_id_file', maxCount: 1 },
    { name: 'passport_file', maxCount: 1 }, // ✅ تضيف دا
    { name: 'contract_file', maxCount: 1 },
    { name: 'additional_files', maxCount: 10 }
])
, async (req, res) => {
    try {
        const client = await Client.findById(req.params.clientId);
        if (!client) {
            return res.status(404).send('Client not found');
        }

        // Save file paths:
        if (req.files['license_file']) {
            client.license_file_path = `/uploads/clients/${client._id}/` + req.files['license_file'][0].filename;
        }
        if (req.files['ejari_file']) {
            client.ejari_file_path = `/uploads/clients/${client._id}/` + req.files['ejari_file'][0].filename;
        }
        if (req.files['emirates_id_file']) {
            client.emirates_id_file_path = `/uploads/clients/${client._id}/` + req.files['emirates_id_file'][0].filename;
        }
        if (req.files['contract_file']) {
            client.contract_file_path = `/uploads/clients/${client._id}/` + req.files['contract_file'][0].filename;
        }
        if (req.files['passport_file']) {
    client.passport_file_path = `/uploads/clients/${client._id}/` + req.files['passport_file'][0].filename;
}


        // Additional files → array of names
        if (req.files['additional_files']) {
            client.additional_files = req.files['additional_files'].map(file => `/uploads/clients/${client._id}/additional/` + file.filename);
        }

        await client.save();

        res.redirect('/clients');
    } catch (err) {
        res.status(500).send('Error uploading files');
    }
});

// Clients.js
router.get('/:clientId/view', async (req, res) => {
    try {
        const client = await Client.findById(req.params.clientId);
        if (!client) {
            return res.status(404).send('Client not found');
        }

        res.render('clientView', { client });
    } catch (err) {
        res.status(500).send('Error loading client details');
    }
});


module.exports = router;
