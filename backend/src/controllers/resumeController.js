// Import system libraries (fs for reading local uploaded files, pdf-parse for parsing text)
const fs = require('fs');
const pdfParse = require('pdf-parse');

// Import the Resume Database Model mapping
const Resume = require('../models/Resume');

// Import AI/parsing service calls from aiService
const { analyzeResume, generateMockQuestions } = require('../services/aiService');

/**
 * Controller to handle resume upload, parsing, and analysis.
 * 1. Checks if a file was successfully sent via Multer middleware.
 * 2. Reads the temp file buffer and extracts text using pdf-parse.
 * 3. Calls the AI analysis to get the ATS match score, evaluation feedback, and missing keywords.
 * 4. Calls the custom mock question generator to get 5 tailored interview questions.
 * 5. Saves the parsed details to MySQL and unlinks/deletes the temp upload file.
 */
const uploadAndAnalyze = async (req, res) => {
    try {
        // Enforce that a file was sent in the request
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a PDF document.' });
        }

        const { jobDescription } = req.body;
        const userId = req.user.id;

        // Parse the PDF text using the file path saved by Multer
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        const extractedText = data.text; // Scraped plain text from the PDF

        // Call the AI Service to analyze the resume against target job description
        const atsScore = await analyzeResume(extractedText, jobDescription);
        
        // Generate 5 custom mock questions based on the candidate's resume text
        const mockQuestions = await generateMockQuestions(extractedText, jobDescription);

        // Save the parsed data and score arrays into the MySQL Resume table
        const resumeRecord = await Resume.create({
            fileName: req.file.originalname,
            extractedText: extractedText.substring(0, 5000), // Stores up to 5k characters in the DB
            atsScore,
            mockQuestions,
            userId
        });

        // Clean up: delete the temporary file from the uploads/ directory to save server space
        fs.unlinkSync(req.file.path);

        // Send confirmation and the created database record back to the frontend
        res.status(200).json({
            message: 'Resume analyzed successfully',
            data: resumeRecord
        });
    } catch (error) {
        console.error("Analysis Error: ", error);
        res.status(500).json({ error: 'Failed to analyze resume' });
    }
};

/**
 * Controller to retrieve all resumes belonging to the logged-in user.
 * Includes retrofitting dynamic mock question generation for historical/legacy resumes.
 */
const getUserResumes = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Query the MySQL database for all resumes owned by this user, ordered by creation date
        const resumes = await Resume.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
        
        // --- DYNAMIC BACKWARD COMPATIBILITY POPULATOR ---
        // Loops through user's historical resumes. If a resume does not have mockQuestions saved in DB,
        // it generates them on the fly and saves the row. This ensures old data displays correctly immediately!
        const updatedResumes = await Promise.all(resumes.map(async (resume) => {
            if (!resume.mockQuestions || resume.mockQuestions.length === 0) {
                const questions = await generateMockQuestions(resume.extractedText);
                resume.mockQuestions = questions;
                await resume.save();
            }
            return resume;
        }));

        res.status(200).json(updatedResumes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    uploadAndAnalyze,
    getUserResumes
};
