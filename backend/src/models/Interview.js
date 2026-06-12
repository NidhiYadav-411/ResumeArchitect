const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Resume = require('./Resume');

const Interview = sequelize.define('Interview', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    transcript: {
        type: DataTypes.JSON, // Will hold array of { role: 'user'|'ai', text: 'hi' }
        allowNull: true,
    },
    score: {
        type: DataTypes.INTEGER, // Overall grading from Gemini
        allowNull: true,
    },
    feedback: {
        type: DataTypes.TEXT('long'), // Detailed feedback text
        allowNull: true,
    }
}, {
    timestamps: true,
});

// Associations
User.hasMany(Interview, { foreignKey: 'userId', onDelete: 'CASCADE' });
Interview.belongsTo(User, { foreignKey: 'userId' });

Resume.hasMany(Interview, { foreignKey: 'resumeId', onDelete: 'CASCADE' });
Interview.belongsTo(Resume, { foreignKey: 'resumeId' });

module.exports = Interview;
