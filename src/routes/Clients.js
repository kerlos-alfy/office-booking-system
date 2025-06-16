const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const upload = require('../utils/multer');
const nationalities = require('../utils/nationalities');
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
    res.render('newClient',{nationalities });
});

// Save new client
router.post('/new', async (req, res) => {
    try {
        const {
       mobile,
    company_en,
    company_ar,
    registered_owner_name_en,
    registered_owner_name_ar,
    nationality_en,
    nationality_ar,
    license_number,
    license_expiry,
    emirates_id_status,
    contract_status,
    license_status,
    ejari_no
        } = req.body;

        const client = new Client({
            mobile,
    company_en,
    company_ar,
    registered_owner_name_en,
    registered_owner_name_ar,
    nationality_en,
    nationality_ar,
    license_number,
    license_expiry,
    emirates_id_status: String(emirates_id_status),
    contract_status: String(contract_status),
    license_status: String(license_status),
    ejari_no
        });

        await client.save();
        res.redirect('/clients');
    } catch (err) {
        console.error('Error saving client:', err);
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
router.post('/:clientId/upload', upload.fields([
    { name: 'license_file', maxCount: 1 },
    { name: 'ejari_file', maxCount: 1 },
    { name: 'emirates_id_file', maxCount: 1 },
    { name: 'passport_file', maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
    { name: 'additional_files', maxCount: 10 }
]), async (req, res) => {
    try {
        const client = await Client.findById(req.params.clientId);
        if (!client) return res.status(404).send('Client not found');

        // 📄 License
        if (req.files['license_file']) {
            client.license_file_path = `/uploads/clients/${client._id}/` + req.files['license_file'][0].filename;
            client.license_status = 'OK';
        }

        // 📄 Ejari
        if (req.files['ejari_file']) {
            client.ejari_file_path = `/uploads/clients/${client._id}/` + req.files['ejari_file'][0].filename;
        }

        // 🆔 Emirates ID
        if (req.files['emirates_id_file']) {
            client.emirates_id_file_path = `/uploads/clients/${client._id}/` + req.files['emirates_id_file'][0].filename;
            client.emirates_id_status = 'OK';
        }

        // 📄 Contract
        if (req.files['contract_file']) {
            client.contract_file_path = `/uploads/clients/${client._id}/` + req.files['contract_file'][0].filename;
            client.contract_status = 'OK';
        }

        // 🛂 Passport
        if (req.files['passport_file']) {
            client.passport_file_path = `/uploads/clients/${client._id}/` + req.files['passport_file'][0].filename;
        }

        // 🗂️ Additional Files
        if (req.files['additional_files']) {
            client.additional_files = req.files['additional_files'].map(file =>
                `/uploads/clients/${client._id}/additional/` + file.filename
            );
        }

        await client.save();
        res.redirect('/clients');

    } catch (err) {
        console.error('Error uploading files:', err);
        res.status(500).send('Error uploading files');
    }
});

// View Client Details
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



// Edit Client Form
router.get('/:clientId/edit', async (req, res) => {
    try {
        const client = await Client.findById(req.params.clientId);
        if (!client) return res.status(404).send('Client not found');

        const nationalities = require('../utils/nationalities');
        res.render('editClient', { client, nationalities });
    } catch (err) {
        res.status(500).send('Error loading edit form');
    }
});
// Update Client
router.post('/:clientId/edit', async (req, res) => {
    try {
        const updateData = {
            mobile: req.body.mobile,
            company_en: req.body.company_en,
            company_ar: req.body.company_ar,
            registered_owner_name_en: req.body.registered_owner_name_en,
            registered_owner_name_ar: req.body.registered_owner_name_ar,
            nationality_en: req.body.nationality_en,
            nationality_ar: req.body.nationality_ar,
            emirates_id_status: req.body.emirates_id_status,
            contract_status: req.body.contract_status,
            license_status: req.body.license_status,
            ejari_no: req.body.ejari_no,
            license_number: req.body.license_number,
            license_expiry: req.body.license_expiry
        };

        await Client.findByIdAndUpdate(req.params.clientId, updateData);
        res.redirect(`/clients/${req.params.clientId}/view`);
    } catch (err) {
        console.error('Error updating client:', err);
        res.status(500).send('Error updating client');
    }
});

module.exports = router;
