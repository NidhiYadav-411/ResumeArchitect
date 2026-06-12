const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const { conductInterviewSync, gradeInterview } = require('../services/aiService');

const startInterview = async (req, res) => {
    try {
        const { resumeId } = req.body;
        const userId = req.user.id;

        const resume = await Resume.findOne({ where: { id: resumeId, userId } });
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        // Generate the first question
        const systemFirstQuestion = await conductInterviewSync(resume.extractedText, []);

        // Create new Interview record
        const interview = await Interview.create({
            userId,
            resumeId,
            transcript: [{ role: 'ai', text: systemFirstQuestion }]
        });

        res.json({ interviewId: interview.id, firstQuestion: systemFirstQuestion });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to start interview' });
    }
};

const sendInterviewMessage = async (req, res) => {
    try {
        const { interviewId, userMessage } = req.body;
        const userId = req.user.id;

        const interview = await Interview.findOne({ where: { id: interviewId, userId } });
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        const resume = await Resume.findOne({ where: { id: interview.resumeId } });

        let transcript = interview.transcript || [];
        transcript.push({ role: 'user', text: userMessage });

        // Map transcript to Google Gen AI part format safely
        const formattedHistory = transcript.map(msg => {
            return `[${msg.role.toUpperCase()}]: ${msg.text}`;
        }).join('\n\n');

        const aiResponse = await conductInterviewSync(resume.extractedText, formattedHistory);

        transcript.push({ role: 'ai', text: aiResponse });

        interview.transcript = [...transcript];
        interview.changed('transcript', true);
        await interview.save();

        res.json({ aiMessage: aiResponse });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body;
        const userId = req.user.id;

        const interview = await Interview.findOne({ where: { id: interviewId, userId } });
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        const resume = await Resume.findOne({ where: { id: interview.resumeId } });

        const gradedResult = await gradeInterview(resume.extractedText, interview.transcript);

        interview.score = gradedResult.score || 0;
        interview.feedback = gradedResult.feedback || "No feedback generated";
        await interview.save();

        res.json({ success: true, score: interview.score, feedback: interview.feedback });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to grade interview' });
    }
};

module.exports = { startInterview, sendInterviewMessage, finishInterview };
