// Import required Sequelize database models
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');

// Import AI methods for conducting the interview and grading from the AI service module
const { conductInterviewSync, gradeInterview } = require('../services/aiService');

/**
 * Endpoint to start a new mock interview session.
 * 1. Validates that the requested resume belongs to the currently authenticated user.
 * 2. Scrape/extracts resume context to feed to Gemini to construct the first customized question.
 * 3. Registers/Syncs a new Interview row in the MySQL database initialized with the first question.
 */
const startInterview = async (req, res) => {
    try {
        const { resumeId } = req.body;
        const userId = req.user.id; // User ID populated by JWT authentication middleware

        // Query the database to find the resume. Ensures security by enforcing the userId constraint.
        const resume = await Resume.findOne({ where: { id: resumeId, userId } });
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        // Generate the introductory question tailored to the candidate's resume
        const systemFirstQuestion = await conductInterviewSync(resume.extractedText, []);

        // Create a new Interview session row. Saves the initial conversation transcript.
        const interview = await Interview.create({
            userId,
            resumeId,
            transcript: [{ role: 'ai', text: systemFirstQuestion }]
        });

        // Respond with the newly created interview session ID and the first question
        res.json({ interviewId: interview.id, firstQuestion: systemFirstQuestion });
    } catch (e) {
        console.error("Error starting interview: ", e);
        res.status(500).json({ error: 'Failed to start interview' });
    }
};

/**
 * Endpoint to submit a candidate's answer and get the interviewer's next follow-up question.
 * 1. Pulls current transcript history from the database.
 * 2. Appends the user's new message.
 * 3. Formats the historical conversation into string tags for the Google Gemini API.
 * 4. Saves the resulting AI response back to the MySQL database JSON column safely.
 */
const sendInterviewMessage = async (req, res) => {
    try {
        const { interviewId, userMessage } = req.body;
        const userId = req.user.id;

        // Query the active interview session, validating user authorization
        const interview = await Interview.findOne({ where: { id: interviewId, userId } });
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        // Retrieve the resume to provide continuing context to the AI model
        const resume = await Resume.findOne({ where: { id: interview.resumeId } });

        // Retrieve the message array or initialize a clean list if empty
        let transcript = interview.transcript || [];
        transcript.push({ role: 'user', text: userMessage });

        // Format the message array into a single flat string block.
        // E.g.: [USER]: I built a React app.\n\n[AI]: Tell me more...
        const formattedHistory = transcript.map(msg => {
            return `[${msg.role.toUpperCase()}]: ${msg.text}`;
        }).join('\n\n');

        // Call Gemini (or the local fallback question router) with the resume and message history
        const aiResponse = await conductInterviewSync(resume.extractedText, formattedHistory);

        // Append the AI's follow-up question to the transcript array
        transcript.push({ role: 'ai', text: aiResponse });

        // --- CRITICAL SEQUELIZE JSON DIRTY CHECK FIXED ---
        // We assign a copy array [...transcript] to change the pointer reference.
        // We explicitly invoke interview.changed('transcript', true) so Sequelize marks the column as dirty.
        // Otherwise, Sequelize skips updating the JSON cell in the database.
        interview.transcript = [...transcript];
        interview.changed('transcript', true);
        await interview.save();

        // Send response back to frontend to speak and display
        res.json({ aiMessage: aiResponse });
    } catch (e) {
        console.error("Error in interview flow: ", e);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

/**
 * Endpoint to conclude the mock interview and grade the performance.
 * 1. Fetches the interview transcript list and the original resume text.
 * 2. Runs the grading analysis (evaluates depth, accuracy, clarity, and keyword integration).
 * 3. Saves the final score and markdown feedback report to the database.
 */
const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body;
        const userId = req.user.id;

        // Fetch the target interview session
        const interview = await Interview.findOne({ where: { id: interviewId, userId } });
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        // Fetch target resume context
        const resume = await Resume.findOne({ where: { id: interview.resumeId } });

        // Grade the transcript (calls Gemini or the advanced local keyword fallback)
        const gradedResult = await gradeInterview(resume.extractedText, interview.transcript);

        // Update database columns with score and report contents
        interview.score = gradedResult.score || 0;
        interview.feedback = gradedResult.feedback || "No feedback generated";
        await interview.save();

        // Return final reports to render on screen
        res.json({ success: true, score: interview.score, feedback: interview.feedback });
    } catch (e) {
        console.error("Error finishing interview: ", e);
        res.status(500).json({ error: 'Failed to grade interview' });
    }
};

module.exports = { startInterview, sendInterviewMessage, finishInterview };
