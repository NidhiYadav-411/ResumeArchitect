const { sequelize } = require('../src/config/database');
const Resume = require('../src/models/Resume');

async function debugResumes() {
    try {
        await sequelize.authenticate();
        console.log("Database connected.");
        const resumes = await Resume.findAll();
        console.log(`Found ${resumes.length} resumes:`);
        resumes.forEach((r, idx) => {
            console.log(`\n--- Resume ${idx + 1}: ${r.fileName} ---`);
            console.log(`Score:`, JSON.stringify(r.atsScore));
            console.log(`Text Length:`, r.extractedText?.length || 0);
            console.log(`Text Preview:`, r.extractedText?.substring(0, 300));
        });
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugResumes();
