const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require('./routes/authRoutes');
const quoteRoutes = require('./routes/quoteRoutes');

app.use(cors());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support URL-encoded bodies
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: err.stack
    });
});

module.exports = app;
