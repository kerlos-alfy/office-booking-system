    // app.js
    const express = require('express');
    const mongoose = require('mongoose');
    const bodyParser = require('body-parser');
    const morgan = require('morgan');
    const path = require('path');
    require('dotenv').config();

    // Import routes
    const branchesRoutes = require('./src/routes/Branch');
    const officesRoutes = require('./src/routes/Offices');
    const clientsRoutes = require('./src/routes/Clients');
    const bookingsRoutes = require('./src/routes/Bookings');
    const paymentsRoutes = require('./src/routes/Payments');
    const reportsRoutes = require('./src/routes/Reports');

    // Initialize app
    const app = express();

    // MongoDB connection
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ MongoDB connected'))
        .catch(err => console.log('❌ MongoDB error:', err));

    // EJS setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'src', 'views'));

    // Middleware
    app.use(bodyParser.urlencoded({ extended: true }));

    // Static files
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ✅ مهم علشان ملفات العملاء

    app.use(morgan('dev'));

    // Main route
    app.get('/', (req, res) => {
        res.render('index', { title: 'Office Booking Dashboard' });
    });

    // Routes
    app.use('/branches', branchesRoutes);
    app.use('/offices', officesRoutes);
    app.use('/clients', clientsRoutes);
    app.use('/bookings', bookingsRoutes);
    app.use('/payments', paymentsRoutes);
    app.use('/reports', reportsRoutes);





    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
