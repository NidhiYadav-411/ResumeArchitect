const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function createDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3307,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'resumearchitect'}\`;`);
        console.log("Database created or already exists.");
        connection.end();
    } catch (error) {
        console.error("Error creating database: ", error);
    }
}

createDatabase();
