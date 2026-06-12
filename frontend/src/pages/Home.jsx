import React from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiTarget, FiBriefcase } from 'react-icons/fi';

const Home = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginTop: '40px', marginBottom: '80px' }}>
        <h1 className="page-title">
          Build a Resume That <span style={{ color: 'var(--accent-color)' }}>Bypasses the ATS</span>
        </h1>
        <p className="page-subtitle" style={{ marginTop: '20px', marginBottom: '40px' }}>
          Upload your resume and the job description. Our AI-driven engine analyzes, scores, and optimizes your application for the best chance to land an interview.
        </p>
        <Link to="/register" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem' }}>
          Start Optimizing For Free
        </Link>
      </div>

      <div className="grid-3" style={{ marginTop: '60px' }}>
        <div className="glass-panel">
          <FiTarget size={40} color="var(--accent-color)" />
          <h3 style={{ margin: '20px 0 10px 0' }}>NLP Matching</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Compare your resume directly against the job description to find missing keywords and formatting flaws.
          </p>
        </div>
        
        <div className="glass-panel">
          <FiTrendingUp size={40} color="#10B981" />
          <h3 style={{ margin: '20px 0 10px 0' }}>ATS Scoring Algorithms</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Get an instant score on how likely your resume is to pass Applicant Tracking Systems.
          </p>
        </div>

        <div className="glass-panel">
          <FiBriefcase size={40} color="#8B5CF6" />
          <h3 style={{ margin: '20px 0 10px 0' }}>AI Interview Prep</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Once your resume is ready, we dynamically generate likely interview questions tailored for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
