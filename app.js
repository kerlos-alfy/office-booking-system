// app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const branchesRoutes = require('./src/routes/Branch');
const officesRoutes = require('./src/routes/Offices');
const clientsRoutes = require('./src/routes/Clients');
const bookingsRoutes = require('./src/routes/Bookings');

require('dotenv').config();

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ MongoDB error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Routes placeholders
app.get('/', (req, res) => {
    res.render('index', { title: 'Office Booking Dashboard' });
});

app.use('/branches', branchesRoutes);
app.use('/offices', officesRoutes);
app.use('/clients', clientsRoutes);
app.use('/bookings', bookingsRoutes);
const paymentsRoutes = require('./src/routes/Payments');
app.use('/payments', paymentsRoutes);
const reportsRoutes = require('./src/routes/Reports');
app.use('/reports', reportsRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
