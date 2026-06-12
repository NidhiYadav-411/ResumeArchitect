import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiFileText, FiAward, FiCheckCircle, FiCheck, FiXCircle } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Dashboard Data
  const [resumes, setResumes] = useState([]);
  const [activeResume, setActiveResume] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchResumes();
  }, [navigate]);

  const fetchResumes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/resume`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResumes(response.data);
      if (response.data.length > 0) {
        setActiveResume(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching resumes", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF file first.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('jobDescription', jobDescription);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/resume/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setSelectedFile(null);
      setJobDescription('');
      fetchResumes(); 
      setActiveResume(response.data.data);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to analyze resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const averageScore = resumes.length > 0
    ? Math.round(resumes.reduce((acc, r) => acc + (r.atsScore?.score || 0), 0) / resumes.length)
    : 0;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div className="page-header" style={{ marginTop: '30px', textAlign: 'left' }}>
        <h2 className="page-title" style={{ fontSize: '2rem' }}>Welcome, {user?.name}</h2>
        <p className="page-subtitle" style={{ marginLeft: 0 }}>Discover exactly what ATS filters are seeing.</p>
      </div>

      <div className="grid-2" style={{ gap: '40px', marginTop: '30px' }}>
        {/* Upload Section */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '20px' }}>Analyze New Document</h3>
          
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">Upload Resume (PDF)</label>
              <div 
                style={{ 
                  border: '2px dashed var(--glass-border)', 
                  padding: '30px', 
                  borderRadius: '12px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => document.getElementById('fileUpload').click()}
              >
                <FiUploadCloud size={40} color={selectedFile ? 'var(--success)' : 'var(--accent-color)'} />
                <p style={{ marginTop: '10px', color: selectedFile ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {selectedFile ? selectedFile.name : 'Click to browse or drag and drop'}
                </p>
                <input 
                  type="file" 
                  id="fileUpload" 
                  accept="application/pdf" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Job Description (Optional)</label>
              <textarea 
                className="input-field" 
                rows="4" 
                placeholder="Paste the job description here for targeted NLP matching..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            
            {uploadError && <div style={{ color: 'var(--danger)', marginBottom: '15px' }}>{uploadError}</div>}

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isUploading}>
              {isUploading ? 'Analyzing via AI Engine...' : 'Run Analysis'}
            </button>
          </form>
        </div>

        {/* Dashboard Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quick Stats */}
          <div className="grid-2" style={{ gap: '20px' }}>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px' }}>
              <FiAward size={35} color="#10B981" />
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Average ATS</p>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{averageScore}%</h3>
              </div>
            </div>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px' }}>
              <FiFileText size={35} color="var(--accent-color)" />
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyzed</p>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{resumes.length} Docs</h3>
              </div>
            </div>
          </div>

          {/* Active Analysis Results */}
          {activeResume ? (
            <div className="glass-panel" style={{ flex: 1, animation: 'fadeIn 0.5s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ marginBottom: '5px' }}>Analysis Report</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activeResume.fileName}</p>
                </div>
                
                <div style={{ 
                  background: `conic-gradient(var(--accent-color) ${activeResume.atsScore?.score}%, rgba(255,255,255,0.1) 0)`,
                  width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ background: 'var(--bg-color)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {activeResume.atsScore?.score}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>AI Feedback</h4>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid var(--accent-color)', padding: '15px', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>{activeResume.atsScore?.feedback}</p>
                </div>
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ marginBottom: '10px' }}>Missing Keywords</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {activeResume.atsScore?.missingKeywords?.map((kw, i) => (
                    <span key={i} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FiXCircle size={14} /> {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '10px' }}>Mock Interview Questions</h4>
                <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                  {activeResume.mockQuestions?.map((q, i) => (
                    <li key={i} style={{ marginBottom: '10px', lineHeight: '1.4' }}>{q}</li>
                  ))}
                </ul>
              </div>

            </div>
          ) : (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <FiFileText size={40} style={{ marginBottom: '15px', opacity: 0.5 }} />
              <p>Upload a resume to see the analysis details here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
