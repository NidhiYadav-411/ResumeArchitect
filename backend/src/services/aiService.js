const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

// Create Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Local Fallback Analyzer for Resume parsing
// English stop words for Vector Space Model tokenization
const stopWords = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further",
    "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's",
    "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into",
    "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's",
    "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
    "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while",
    "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
    "you've", "your", "yours", "yourself", "yourselves"
]);

// Tokenizer & Term Frequency helper
const getTermFrequencies = (text) => {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ') // replace punctuation with spaces
        .split(/[\s_]+/)           // split by whitespace or underscores
        .filter(w => w.length > 1 && !stopWords.has(w));
    
    const tf = {};
    words.forEach(w => {
        tf[w] = (tf[w] || 0) + 1;
    });
    return tf;
};

// Cosine Similarity calculator
const computeCosineSimilarity = (tf1, tf2) => {
    const vocab = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    vocab.forEach(word => {
        const val1 = tf1[word] || 0;
        const val2 = tf2[word] || 0;
        
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
    });
    
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};

// Local Fallback Analyzer for Resume parsing using Vector Space Model
const localAnalyzeResume = (resumeText, jobDescription) => {
    const textToSearch = (resumeText || "").toLowerCase().replace(/\s+/g, ' ');
    const jdTextRaw = (jobDescription || "").trim();
    
    // Standard baseline developer job description if none provided
    const standardJD = `
        software engineer developer React JavaScript TypeScript Node.js express SQL Database REST APIs testing cloud deployment Git GitHub agile.
        Collaborate with team members to design, develop, test, and deploy scalable web applications. Write clean, maintainable, and efficient code.
        Solve complex problems, conduct code reviews, write unit tests, and integrate third-party services.
    `;
    const jdText = (jdTextRaw.length > 15 ? jdTextRaw : standardJD).toLowerCase().replace(/\s+/g, ' ');

    // Standard list of tech keywords for custom check
    const commonKeywords = [
        "react", "javascript", "typescript", "node.js", "nodejs", "express", "python", "java", "sql", "mysql", "mongodb", "postgresql", 
        "aws", "docker", "kubernetes", "git", "github", "ci/cd", "rest api", "apis", "graphql", "html", "css", "tailwind", "redux", "next.js", "nextjs", 
        "testing", "jest", "agile", "scrum", "cloud", "c++", "c#", "ruby", "rails", "django", "flask", "springboot", "angular", "vue"
    ];

    // Helper matcher that checks synonyms/variants
    const checkKeywordMatch = (text, keyword) => {
        const kw = keyword.toLowerCase();
        
        // Exact inclusion
        if (text.includes(kw)) return true;
        
        // Custom variant rules
        const variants = {
            "node.js": ["nodejs", "node js", "node"],
            "nodejs": ["node.js", "node js", "node"],
            "ci/cd": ["cicd", "ci-cd", "continuous integration", "continuous deployment", "jenkins", "github actions"],
            "rest api": ["restapi", "rest-api", "restful api", "apis", "web services"],
            "apis": ["api", "rest api", "graphql"],
            "git": ["github", "gitlab", "version control"],
            "sql": ["database", "mysql", "postgresql", "sqlite", "query", "queries"],
            "cloud": ["aws", "azure", "gcp", "amazon web services", "cloud computing"],
            "testing": ["test", "tests", "jest", "cypress", "mocha", "selenium", "qa"],
            "next.js": ["nextjs", "next js"],
            "react": ["reactjs", "react js", "frontend"],
            "javascript": ["js", "es6"],
            "typescript": ["ts"],
            "tailwind": ["tailwind css", "tailwindcss"]
        };
        
        if (variants[kw]) {
            return variants[kw].some(variant => text.includes(variant));
        }
        
        return false;
    };

    // Find keywords mentioned in the JD
    let jdKeywords = [];
    if (jdTextRaw.length > 15) {
        jdKeywords = commonKeywords.filter(kw => jdText.includes(kw));
    }

    // Baseline fallback if JD is short or empty
    const baselineKeywords = ["react", "javascript", "node.js", "git", "sql", "apis", "testing", "cloud", "ci/cd"];

    // Combine/ensure we have a reasonable list of keywords to evaluate against
    const keywordsToEvaluate = jdKeywords.length >= 4 ? jdKeywords : [...new Set([...jdKeywords, ...baselineKeywords])];

    // Find which keywords are missing
    const missingKeywords = keywordsToEvaluate.filter(kw => !checkKeywordMatch(textToSearch, kw));

    // Vector Space Model analysis
    const tfResume = getTermFrequencies(textToSearch);
    const tfJD = getTermFrequencies(jdText);
    const similarity = computeCosineSimilarity(tfResume, tfJD);

    // Calculate technical keyword match ratio
    const matchedCount = keywordsToEvaluate.length - missingKeywords.length;
    const keywordMatchRatio = keywordsToEvaluate.length > 0 ? (matchedCount / keywordsToEvaluate.length) : 0.6;
    
    // --- SOPHISTICATED STRUCTURAL ATS SCORING ---
    let score = 25; // Base starting score

    // 1. Contact Details check (up to +15 pts)
    const hasEmail = textToSearch.includes("@") || textToSearch.includes("email") || textToSearch.includes("gmail.com");
    const hasPhone = /[\+\d\-\(\)\s]{8,15}/.test(textToSearch) || textToSearch.includes("phone") || textToSearch.includes("contact");
    const hasSocials = textToSearch.includes("github") || textToSearch.includes("linkedin") || textToSearch.includes("leetcode");
    
    if (hasEmail) score += 5;
    if (hasPhone) score += 5;
    if (hasSocials) score += 5;

    // 2. Resume Sections check (up to +15 pts)
    const hasEducation = textToSearch.includes("education") || textToSearch.includes("college") || textToSearch.includes("university") || textToSearch.includes("academic") || textToSearch.includes("school");
    const hasProjects = textToSearch.includes("project") || textToSearch.includes("projects") || textToSearch.includes("experience") || textToSearch.includes("work");
    const hasSkills = textToSearch.includes("skill") || textToSearch.includes("skills") || textToSearch.includes("languages") || textToSearch.includes("technologies") || textToSearch.includes("expertise");

    if (hasEducation) score += 5;
    if (hasProjects) score += 5;
    if (hasSkills) score += 5;

    // 3. Technical Keyword match ratio (up to +20 pts)
    if (keywordMatchRatio >= 0.85) {
        score += 20;
    } else if (keywordMatchRatio >= 0.70) {
        score += 16;
    } else if (keywordMatchRatio >= 0.50) {
        score += 12;
    } else if (keywordMatchRatio >= 0.30) {
        score += 8;
    } else {
        score += 4;
    }

    // 4. VSM Cosine Similarity contribution (up to +20 pts)
    const similarityPoints = Math.round(similarity * 50); // scales 0.25 similarity to 12.5 pts
    score += Math.min(20, similarityPoints + 3);

    // 5. Word Count Suitability (up to +10 pts)
    const wordCount = textToSearch.split(/\s+/).length;
    if (wordCount >= 250 && wordCount <= 750) {
        score += 10;
    } else if ((wordCount >= 150 && wordCount < 250) || (wordCount > 750 && wordCount <= 1200)) {
        score += 5;
    }

    // Cap at 97
    score = Math.max(35, Math.min(97, score));

    // Formulate custom, context-rich feedback
    let feedback = "";
    const matchedKeywords = keywordsToEvaluate.filter(kw => checkKeywordMatch(textToSearch, kw));
    const formatKeyword = (kw) => kw.toUpperCase();

    if (missingKeywords.length === 0) {
        feedback = `[Lexical Match: ${Math.round(similarity * 100)}%] Excellent match! Your resume contains all the identified technical skills from the job description, including ${matchedKeywords.slice(0, 3).map(formatKeyword).join(', ')}. Your profile aligns exceptionally well with this position's requirements.`;
    } else {
        feedback = `[Lexical Match: ${Math.round(similarity * 100)}%] Your resume has a strong base matching keywords like ${matchedKeywords.slice(0, 3).map(formatKeyword).join(', ') || 'basic industry terms'}. However, it would benefit from incorporating key terms such as ${missingKeywords.slice(0, 3).map(formatKeyword).join(', ')}. Adding details about projects or experience with these technologies will improve your overall ATS score.`;
    }

    return {
        score,
        feedback,
        missingKeywords: missingKeywords.length > 0 ? missingKeywords.map(formatKeyword) : ["No major missing technical keywords detected!"]
    };
};

// Local Fallback Interview bot
const localConductInterview = (resumeText, pastMessages) => {
    const messagesStr = typeof pastMessages === 'string' ? pastMessages : JSON.stringify(pastMessages || "");
    const userMessageCount = (messagesStr.match(/\[USER\]|role":\s*"user"/gi) || []).length;

    const questions = [
        "Welcome! To start, could you please walk me through your background and describe one of the technical projects listed on your resume?",
        "Interesting. In that project, what was the most challenging technical obstacle you faced, and how did you resolve it?",
        "Thank you. This role requires robust and scalable designs. How would you design a simple rate limiter or caching mechanism for a high-traffic web application?",
        "Got it. How do you approach writing tests for your codebase, and what testing libraries or practices do you typically use?",
        "Lastly, could you share a situation where you had a disagreement with a team member about a technical choice, and how you reached a resolution?",
        "Thank you for sharing that. The interview is now complete! Please click the 'Finish Interview' button at the top to receive your final feedback and grading report."
    ];

    if (userMessageCount >= questions.length) {
        return questions[questions.length - 1];
    }
    return questions[userMessageCount];
};

// Local Fallback Interview grader
const localGradeInterview = (resumeText, transcript) => {
    let wordCount = 0;
    let userMessageCount = 0;
    let userAnswers = [];
    
    if (Array.isArray(transcript)) {
        transcript.forEach(msg => {
            if (msg.role === 'user') {
                const text = (msg.text || "").trim();
                if (text) {
                    wordCount += text.split(/\s+/).length;
                    userMessageCount++;
                    userAnswers.push(text);
                }
            }
        });
    }

    if (userMessageCount === 0) {
        return {
            score: 30,
            feedback: `### 🌟 Interview Performance Report (Local Analyzer)

⚠️ **No responses detected.**
The interview transcript did not contain any answers from the candidate. Please make sure to speak or type your answers before finishing the interview.`
        };
    }

    const averageWords = wordCount / userMessageCount;

    // 1. Identify tech keywords from Resume
    const commonKeywords = [
        "react", "javascript", "typescript", "node.js", "nodejs", "express", "python", "java", "sql", "mysql", "mongodb", "postgresql", 
        "aws", "docker", "kubernetes", "git", "github", "ci/cd", "rest api", "apis", "graphql", "html", "css", "tailwind", "redux", "next.js", "nextjs", 
        "testing", "jest", "agile", "scrum", "cloud", "c++", "c#", "ruby", "rails", "django", "flask", "springboot", "angular", "vue"
    ];
    
    const resumeTextLower = (resumeText || "").toLowerCase();
    const resumeKeywords = commonKeywords.filter(kw => {
        const variants = {
            "node.js": ["nodejs", "node js", "node"],
            "nodejs": ["node.js", "node js", "node"],
            "ci/cd": ["cicd", "ci-cd", "continuous integration", "continuous deployment"],
            "rest api": ["restapi", "rest-api", "restful api", "apis"],
            "apis": ["api", "rest api", "graphql"],
            "git": ["github", "gitlab"],
            "sql": ["database", "mysql", "postgresql", "sqlite"],
            "cloud": ["aws", "azure", "gcp"],
            "next.js": ["nextjs", "next js"],
            "react": ["reactjs", "react js"]
        };
        if (variants[kw]) {
            return variants[kw].some(v => resumeTextLower.includes(v)) || resumeTextLower.includes(kw);
        }
        return resumeTextLower.includes(kw);
    });

    // 2. Check which resume keywords are mentioned in the answers
    const answersTextLower = userAnswers.join(" ").toLowerCase();
    const mentionedResumeKeywords = resumeKeywords.filter(kw => {
        const variants = {
            "node.js": ["nodejs", "node js", "node"],
            "nodejs": ["node.js", "node js", "node"],
            "ci/cd": ["cicd", "ci-cd", "continuous integration", "continuous deployment"],
            "rest api": ["restapi", "rest-api", "restful api", "apis"],
            "apis": ["api", "rest api", "graphql"],
            "git": ["github", "gitlab"],
            "sql": ["database", "mysql", "postgresql", "sqlite"],
            "cloud": ["aws", "azure", "gcp"],
            "next.js": ["nextjs", "next js"],
            "react": ["reactjs", "react js"]
        };
        if (variants[kw]) {
            return variants[kw].some(v => answersTextLower.includes(v)) || answersTextLower.includes(kw);
        }
        return answersTextLower.includes(kw);
    });

    const unmentionedResumeKeywords = resumeKeywords.filter(kw => !mentionedResumeKeywords.includes(kw));

    // 3. Technical Depth check: look for explanation verbs & technical nouns
    const depthWords = [
        "design", "architecture", "scale", "performance", "optimize", "query", "index", "cache", "limiter", "middleware", 
        "component", "state", "hook", "effect", "security", "encryption", "auth", "token", "session", "test", "mock", 
        "coverage", "integration", "deploy", "pipeline", "challenge", "solved", "error", "debug", "issue", "trade-off"
    ];
    const depthScoreList = depthWords.filter(w => answersTextLower.includes(w));
    
    // 4. Scoring logic (out of 100)
    // - Technical Depth & Accuracy (max 40 pts)
    //   Base 15 + points for unique depth words + points for resume keywords mentioned
    let techDepthPts = 15;
    techDepthPts += Math.min(15, depthScoreList.length * 1.5);
    if (resumeKeywords.length > 0) {
        techDepthPts += Math.min(10, (mentionedResumeKeywords.length / resumeKeywords.length) * 10);
    } else {
        techDepthPts += 8;
    }
    
    // - Communication & Structure (max 20 pts)
    //   Based on average words per answer (aiming for ~40-80 words) and structure indicators
    let commPts = 8;
    if (averageWords > 60) commPts += 12;
    else if (averageWords > 35) commPts += 9;
    else if (averageWords > 15) commPts += 6;
    else commPts += 2;
    
    // Structure words: "first", "second", "then", "because", "finally", "however", "therefore", "example"
    const structureWords = ["first", "then", "because", "finally", "however", "therefore", "example", "result", "situation"];
    const structureScoreList = structureWords.filter(w => answersTextLower.includes(w));
    commPts += Math.min(8, structureScoreList.length * 1.5);

    // - Problem Solving & Design (max 20 pts)
    //   Based on problem-solving keywords (e.g. challenge, solve, fix, choice, reason, debug, tradeoff)
    let problemSolvingPts = 5;
    const psWords = ["challenge", "solve", "fixed", "choice", "tradeoff", "trade-off", "reason", "decision", "architecture", "design", "prevent", "handle"];
    const psCount = psWords.filter(w => answersTextLower.includes(w)).length;
    problemSolvingPts += Math.min(15, psCount * 2.5);

    // - Resume Alignment (max 20 pts)
    //   How well they reference their resume/experience: "project", "experience", "work", "resume", "team", "worked"
    let alignmentPts = 5;
    const alignWords = ["project", "experience", "work", "resume", "team", "role", "company", "worked", "built", "implemented"];
    const alignCount = alignWords.filter(w => answersTextLower.includes(w)).length;
    alignmentPts += Math.min(15, alignCount * 2.5);

    const totalScore = Math.max(30, Math.min(98, Math.round(techDepthPts + commPts + problemSolvingPts + alignmentPts)));

    // 5. Generate descriptive report
    let feedback = `### 🌟 Interview Performance Report (Local Analyzer)

#### 📊 Rubric Scores:
- **Technical Depth & Accuracy**: ${Math.round(techDepthPts / 4)}/10
- **Communication & Structure**: ${Math.round(commPts / 2)}/10
- **Problem Solving & Design**: ${Math.round(problemSolvingPts / 2)}/10
- **Resume Alignment**: ${Math.round(alignmentPts / 2)}/10

#### 📝 Detailed Feedback:
Your average answer length was **${Math.round(averageWords)} words**. `;

    if (averageWords < 15) {
        feedback += `Your responses were quite brief. In technical interviews, detailed elaboration is vital. Try walking the interviewer through the architecture, step-by-step logic, and specific library/technology implementations rather than giving one-sentence summaries. `;
    } else if (averageWords < 40) {
        feedback += `You provided clear, concise answers, but they lacked deeper technical design and architectural context. Discussing trade-offs (e.g., why you chose one database over another, or how you managed state) would elevate your score. `;
    } else {
        feedback += `You demonstrated good depth and provided comprehensive answers that explained the context and solutions effectively. `;
    }

    if (mentionedResumeKeywords.length > 0) {
        feedback += `\n\nYou did a good job of referencing some skills listed on your resume, specifically: **${mentionedResumeKeywords.map(k => k.toUpperCase()).join(", ")}**.`;
    }

    if (unmentionedResumeKeywords.length > 0) {
        feedback += `\n\nTo better align your interview with your profile, consider bringing up other resume skills when relevant, such as: *${unmentionedResumeKeywords.slice(0, 4).map(k => k.toUpperCase()).join(", ")}*.`;
    }

    feedback += `\n\n####  Strengths:
- **Keyword Integration**: Mentioned key technical terms like ${mentionedResumeKeywords.slice(0, 3).map(k => `\`${k}\``).join(", ") || 'relevant general development terminology'}.
- **Core Coverage**: Responded to ${userMessageCount} interviewer questions during the session.`;

    if (averageWords >= 35) {
        feedback += `\n- **Elaboration**: Provided sufficient detail per response to explain technical contexts.`;
    }

    feedback += `\n\n#### 🛠 Areas for Improvement & Actionable Advice:`;
    if (averageWords < 30) {
        feedback += `\n- **Elaborate using the STAR Method**: For behavioral and technical questions, describe the **S**ituation, **T**ask, **A**ction, and **R**esult to make your answers more structured and complete.`;
    }
    if (unmentionedResumeKeywords.length > 3) {
        feedback += `\n- **Reference Resume Details**: Connect your conceptual answers directly back to real-world projects or accomplishments mentioned in your resume.`;
    }
    feedback += `\n- **Discuss Trade-offs**: When answering design questions, explain the pros and cons of your chosen approach compared to alternatives.`;

    return {
        score: totalScore,
        feedback
    };
};

const analyzeResume = async (resumeText, jobDescription) => {
    try {
        const prompt = `You are a strict ATS (Applicant Tracking System) parser and an expert technical recruiter.
I will provide you with a resume text and optionally a Job Description.
Evaluate how well the resume matches the JD (or general industry standards if JD is missing or short).

Task: Provide the response STRICTLY as a JSON object with the following keys and no extra formatting/markdown:
{
  "score": <Integer from 0 to 100>,
  "feedback": "<A helpful 2-3 sentence paragraph evaluating the alignment>",
  "missingKeywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"]
}

Job Description:
${jobDescription || "Standard software engineering / tech industry role."}

Resume:
${resumeText.substring(0, 8000)} // Ensure we don't blow context limit
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Ensure the output is strictly JSON
                responseMimeType: "application/json"
            }
        });

        // The response text should be JSON due to responseMimeType
        let responseText = response.text || "";
        
        let jsonStr = responseText;
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }
        
        let jsonResponse = JSON.parse(jsonStr);
        return jsonResponse;
    } catch (e) {
        console.error("Gemini Analyze Error, falling back to local analysis: ", e);
        return localAnalyzeResume(resumeText, jobDescription);
    }
};

const conductInterviewSync = async (resumeText, pastMessages, jobDescription) => {
    try {
        // pastMessages is an array: [{ role: 'user'|'model', parts: [{text: '... '}] }]
        // If pastMessages is empty, we act first as the interviewer.
        const systemInstruction = `You are a strict hiring manager conducting a technical and behavioral interview.
The candidate has submitted the following resume:
${resumeText.substring(0, 5000)}

And optionally the job description they are applying for is: ${jobDescription || "General tech role"}

Rules:
1. Ask exactly ONE interview question at a time.
2. Wait for the candidate to answer before asking the next question.
3. Base your questions directly on their resume and the job description. Push them on vague bullet points.
4. If they give a short answer, politely ask them to expand or give a follow-up. Keep your responses under 3 sentences.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: pastMessages.length === 0 ? "Hello! Start the interview with the first question." : pastMessages,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        return response.text;
    } catch (e) {
        console.error("Gemini Interview Error, falling back to local interview questions: ", e);
        return localConductInterview(resumeText, pastMessages);
    }
};

const gradeInterview = async (resumeText, transcript) => {
    try {
         const prompt = `You are an expert technical interviewer and hiring manager.
Your task is to review the candidate's resume and the transcript of their mock technical interview, then provide a highly accurate, constructive, and detailed evaluation.

Candidate Resume Details:
${resumeText.substring(0, 4000)}

Interview Transcript:
${JSON.stringify(transcript)}

Please evaluate the candidate strictly and professionally across the following dimensions:
1. Technical Depth & Accuracy (40% weight): Did the candidate demonstrate real, accurate knowledge of the technologies they claim to know? Did they explain concepts with depth, or did they keep it surface-level/vague?
2. Communication & Structure (20% weight): Did the candidate structure their answers clearly (e.g., using STAR method for behavioral/scenario questions)? Were they concise yet comprehensive?
3. Problem Solving & Abstraction (20% weight): Did they detail implementation steps, trade-offs, and design choices when prompted?
4. Alignment with Resume (20% weight): Did they successfully connect their answers to actual achievements, projects, or experiences mentioned in their resume?

Provide the response STRICTLY as a JSON object (no markdown, no backticks, no text outside the JSON) with the following structure:
{
  "score": <Integer from 0 to 100 representing the weighted final score>,
  "feedback": "### 🌟 Interview Performance Report\\n\\n#### 📊 Rubric Scores:\\n- **Technical Depth & Accuracy**: X/10\\n- **Communication & Structure**: X/10\\n- **Problem Solving & Design**: X/10\\n- **Resume Alignment**: X/10\\n\\n#### 📝 Detailed Feedback:\\n[Provide a detailed evaluation of their answers. Point out specific questions where they did well, and questions where they gave weak, inaccurate, or superficial answers.]\\n\\n####  Strengths:\\n- [Strength 1]\\n- [Strength 2]\\n\\n#### 🛠 Areas for Improvement & Actionable Advice:\\n- [Actionable advice 1]\\n- [Actionable advice 2]"
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        let responseText = response.text || "";
        
        let jsonStr = responseText;
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Gemini Grading Error, falling back to local grading: ", e);
        return localGradeInterview(resumeText, transcript);
    }
};

const localGenerateMockQuestions = (resumeText, jobDescription) => {
    const resumeTextLower = (resumeText || "").toLowerCase();
    
    // Check for specific tech categories in the resume
    const techQuestions = {
        react: [
            "Could you explain how you managed state in your React projects, and when you would choose Redux/Context API over local component state?",
            "How do you optimize React component performance? Specifically, what are the differences between useMemo, useCallback, and React.memo?"
        ],
        javascript: [
            "What is the difference between asynchronous behavior in JavaScript using Promises vs. Async/Await, and how do you handle errors in both?",
            "Can you explain event delegation in JavaScript and how prototype inheritance works?"
        ],
        typescript: [
            "What are the benefits of TypeScript over JavaScript in a large codebase, and how do you use interfaces vs. type aliases?",
            "How do you configure strict type checking in TypeScript, and what is your approach to handling the 'any' type?"
        ],
        "node.js": [
            "Explain how Node.js handles asynchronous operations using the Event Loop under the hood.",
            "How do you handle error middleware and routing architecture in an Express.js backend?"
        ],
        nodejs: [
            "Explain how Node.js handles asynchronous operations using the Event Loop under the hood.",
            "How do you handle error middleware and routing architecture in an Express.js backend?"
        ],
        express: [
            "How do you design RESTful API routing and secure your endpoints using middleware in Express?",
            "What strategies do you use for request validation and rate limiting in an Express application?"
        ],
        python: [
            "How does memory management/garbage collection work in Python, and what is the difference between lists and tuples?",
            "How do you write asynchronous or concurrent tasks in Python using libraries like asyncio or threading?"
        ],
        java: [
            "Explain the concept of OOP (Object-Oriented Programming) principles and how polymorphism is achieved in Java.",
            "How does the JVM manage memory, and what is the difference between stack and heap memory?"
        ],
        sql: [
            "What are database indexes, how do they work, and how do you optimize a slow-performing SQL query?",
            "Explain the difference between different types of SQL JOINs and when to use subqueries vs. joins."
        ],
        mongodb: [
            "What are the design trade-offs between a NoSQL database like MongoDB and a relational SQL database?",
            "How do you handle schema design and document relationships (embedding vs. referencing) in MongoDB?"
        ],
        aws: [
            "What AWS services have you worked with, and how would you design a secure, auto-scaling deployment for a web application?",
            "Explain the differences between serverless computing (like AWS Lambda) vs. container hosting (like EC2/ECS) and their trade-offs."
        ],
        docker: [
            "How does Docker achieve container isolation, and what are the differences between a Docker image and a container?",
            "Explain how you construct multi-stage Dockerfiles to keep production builds lightweight."
        ],
        testing: [
            "What is your testing strategy (unit, integration, E2E), and how do you structure mock tests for API endpoints?",
            "How do you achieve test coverage targets and handle testing database interactions?"
        ],
        "ci/cd": [
            "Explain the architecture of a CI/CD pipeline you have set up or used. What automation steps did it include?",
            "How do you manage secret keys and deployment rolls (blue-green or rolling updates) in a CI/CD process?"
        ]
    };

    const detectedSkills = [];
    Object.keys(techQuestions).forEach(skill => {
        if (resumeTextLower.includes(skill)) {
            detectedSkills.push(skill);
        }
    });

    const selectedQuestions = [];
    selectedQuestions.push("Could you walk me through one of the most complex projects on your resume, and explain the key architecture decisions you made?");

    let questionIndex = 0;
    if (detectedSkills.length > 0) {
        detectedSkills.forEach(skill => {
            if (selectedQuestions.length < 5) {
                const list = techQuestions[skill];
                const q = list[questionIndex % list.length];
                selectedQuestions.push(q);
                questionIndex++;
            }
        });
    }

    const fallbackTechQuestions = [
        "In your past project, what was the most challenging technical obstacle you faced, and how did you resolve it?",
        "How do you approach code quality, reviews, and collaboration within an agile developer team?",
        "When designing web interfaces or APIs, how do you handle authentication, authorization, and secure credentials?",
        "How do you approach learning a new framework or technology when starting a project under tight deadlines?"
    ];

    let fallbackIdx = 0;
    while (selectedQuestions.length < 5 && fallbackIdx < fallbackTechQuestions.length) {
        selectedQuestions.push(fallbackTechQuestions[fallbackIdx]);
        fallbackIdx++;
    }

    return selectedQuestions;
};

const generateMockQuestions = async (resumeText, jobDescription) => {
    try {
        const prompt = `You are a professional technical recruiter and hiring manager.
Your task is to generate 5 tailored, highly accurate, and specific interview questions for a candidate based on their resume and the target job description (if provided).
The questions should probe the candidate's actual experience, projects, and technologies mentioned in their resume, pushing them to explain implementation details, challenges, or architectural decisions.

Target Job Description:
${jobDescription || "General software engineer / technical developer role."}

Candidate Resume:
${resumeText.substring(0, 4000)}

Please output the response STRICTLY as a JSON array of strings containing exactly 5 questions, with no extra text or markdown formatting. E.g.:
[
  "Question 1?",
  "Question 2?"
]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonResponse = JSON.parse(response.text || "[]");
        if (Array.isArray(jsonResponse) && jsonResponse.length > 0) {
            return jsonResponse;
        }
        throw new Error("Invalid response format from Gemini");
    } catch (e) {
        console.error("Gemini Questions Generation Error, falling back to local questions: ", e);
        return localGenerateMockQuestions(resumeText, jobDescription);
    }
};

module.exports = { analyzeResume, conductInterviewSync, gradeInterview, generateMockQuestions };
