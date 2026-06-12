const User = require('../models/User');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');

const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalResumes = await Resume.count();
        const totalInterviews = await Interview.count();

        // Bring all users with their stats
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'createdAt'],
            include: [
                { model: Resume, attributes: ['id'] },
                { model: Interview, attributes: ['id', 'score'] }
            ]
        });

        const usersData = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            joinedAt: u.createdAt,
            resumesAnalyzed: u.Resumes.length,
            interviewsTaken: u.Interviews.length,
            averageInterviewScore: u.Interviews.length > 0
                ? Math.round(u.Interviews.reduce((acc, curr) => acc + (curr.score || 0), 0) / u.Interviews.length)
                : 0
        }));

        res.json({
            stats: { totalUsers, totalResumes, totalInterviews },
            users: usersData
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

module.exports = { getDashboardStats };
