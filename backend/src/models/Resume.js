const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Resume = sequelize.define('Resume', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    extractedText: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    atsScore: {
        type: DataTypes.JSON, 
        allowNull: true,
    },
    mockQuestions: {
        type: DataTypes.JSON,
        allowNull: true,
    }
}, {
    timestamps: true,
});

// Associations
User.hasMany(Resume, { foreignKey: 'userId', onDelete: 'CASCADE' });
Resume.belongsTo(User, { foreignKey: 'userId' });

module.exports = Resume;
