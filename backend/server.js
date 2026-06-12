const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./src/config/database');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to Resume Architect API' });
});

// Import and use routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/resume', require('./src/routes/resume'));
app.use('/api/interview', require('./src/routes/interview'));
app.use('/api/admin', require('./src/routes/admin'));

const PORT = process.env.PORT || 5000;

// Authenticate database and start server
sequelize.authenticate()
    .then(() => {
        console.log('MySQL Database connected...');
        return sequelize.sync(); // Sync models
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });
