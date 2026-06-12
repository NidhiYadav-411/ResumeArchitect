const fs = require('fs');
const pdfParse = require('pdf-parse');
const Resume = require('../models/Resume');
const { analyzeResume, generateMockQuestions } = require('../services/aiService');

const uploadAndAnalyze = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a PDF document.' });
        }

        const { jobDescription } = req.body;
        const userId = req.user.id;

        // Parse the PDF text
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        const extractedText = data.text;

        // Call the AI Service
        const atsScore = await analyzeResume(extractedText, jobDescription);
        const mockQuestions = await generateMockQuestions(extractedText, jobDescription);

        // Save to Database
        const resumeRecord = await Resume.create({
            fileName: req.file.originalname,
            extractedText: extractedText.substring(0, 5000), // Arbitrary limit for DB storage
            atsScore,
            mockQuestions,
            userId
        });

        // Clean up uploaded file since we stored the text/analysis
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            message: 'Resume analyzed successfully',
            data: resumeRecord
        });
    } catch (error) {
        console.error("Analysis Error: ", error);
        res.status(500).json({ error: 'Failed to analyze resume' });
    }
};

const getUserResumes = async (req, res) => {
    try {
        const userId = req.user.id;
        const resumes = await Resume.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
        
        // Populate mockQuestions dynamically for any legacy resumes
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
