const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// عرض كل العملاء
router.get('/', async (req, res) => {
    try {
        const clients = await Client.find();
        res.render('clients', { clients });
    } catch (err) {
        res.status(500).send('Error loading clients');
    }
});

// Form: إضافة عميل
router.get('/new', (req, res) => {
    res.render('newClient');
});

// Save new client
router.post('/new', async (req, res) => {
    try {
        const client = new Client({
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email
        });
        await client.save();
        res.redirect('/clients');
    } catch (err) {
        res.status(500).send('Error saving client');
    }
});

module.exports = router;
