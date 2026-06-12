const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const dialectOptions = {};
// Automatically enable SSL connection if DB is hosted on a remote server (e.g. Aiven MySQL)
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
    dialectOptions.ssl = {
        rejectUnauthorized: false
    };
}

const sequelize = new Sequelize(
    process.env.DB_NAME || 'resumearchitect',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3307,
        dialect: 'mysql',
        dialectOptions,
        logging: false
    }
);

module.exports = { sequelize };
