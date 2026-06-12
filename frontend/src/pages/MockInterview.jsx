import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiSend } from 'react-icons/fi';
import axios from 'axios';

const MockInterview = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [interviewId, setInterviewId] = useState(null);
  
  const [transcriptData, setTranscriptData] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [cameraOn, setCameraOn] = useState(true);
  
  const recognitionRef = useRef(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch user resumes
    axios.get('http://localhost:5000/api/resume', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      setResumes(response.data);
      if (response.data.length > 0) {
        setSelectedResumeId(response.data[0].id);
      }
    }).catch(err => console.error(err));

    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        setIsRecording(true);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setSpeechText(finalTranscript + interimTranscript);
      };
      
      recognitionRef.current = recognition;
    }
  }, [navigate]);

  const startInterview = async () => {
    if (!selectedResumeId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/interview/start', 
        { resumeId: selectedResumeId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setInterviewId(response.data.interviewId);
      const firstQ = response.data.firstQuestion;
      setTranscriptData([{ role: 'ai', text: firstQ }]);
      
      // Speak the first question aloud
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(firstQ);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to start interview.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setSpeechText('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const submitAnswer = async () => {
    if (!speechText.trim()) return;
    
    // Stop recording if active
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const userMessage = speechText.trim();
    setSpeechText('');
    
    // Optimistic UI update
    const updatedTranscript = [...transcriptData, { role: 'user', text: userMessage }];
    setTranscriptData(updatedTranscript);
    setIsProcessingAI(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/interview/message', 
        { interviewId, userMessage },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const nextQ = response.data.aiMessage;
      setTranscriptData([...updatedTranscript, { role: 'ai', text: nextQ }]);
      
      // Speak the subsequent questions aloud
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(nextQ);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const finishInterview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/interview/finish', 
        { interviewId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setInterviewFinished(true);
      setFinalReport(response.data);
    } catch (e) {
      console.error(e);
      alert('Failed to grade interview.');
    }
  };

  // If no resumes
  if (resumes.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>No Resumes Found</h2>
        <p>Please upload a resume on your dashboard before starting an interview.</p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div className="page-header" style={{ marginTop: '30px', textAlign: 'left' }}>
        <h2 className="page-title" style={{ fontSize: '2rem' }}>AI Mock Interview</h2>
        <p className="page-subtitle" style={{ marginLeft: 0 }}>Video and audio enabled. Speak naturally, the AI is listening.</p>
      </div>

      {!interviewId && !interviewFinished && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
          <h3>Select a Resume Profile</h3>
          <select 
            className="input-field" 
            style={{ margin: '20px 0' }}
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
          >
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.fileName} (Parsed: {new Date(r.createdAt).toLocaleDateString()})</option>
            ))}
          </select>
          <button className="btn-primary" style={{ width: '100%' }} onClick={startInterview}>
            Start Camera & Audio Interview
          </button>
          
          <div style={{ marginTop: '20px', color: 'var(--danger)', fontSize: '0.85rem' }}>
            Note: This requires webcam and microphone permissions. Chrome/Edge recommended for Speech SDK.
          </div>
        </div>
      )}

      {interviewId && !interviewFinished && (
        <div className="grid-2" style={{ gap: '30px' }}>
          {/* Left Column: Video and Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '10px', display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '400px' }}>
              {cameraOn ? (
                 <Webcam audio={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} mirrored={true} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  <FiVideoOff size={50} />
                </div>
              )}
              
              {/* Overlay Controls */}
              <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '15px' }}>
                <button 
                  onClick={() => setCameraOn(!cameraOn)} 
                  style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer' }}
                >
                  {cameraOn ? <FiVideo size={24} /> : <FiVideoOff size={24} />}
                </button>
                <button 
                  onClick={toggleRecording} 
                  style={{ background: isRecording ? '#EF4444' : 'rgba(0,0,0,0.6)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  {isRecording ? <FiMic size={24} /> : <FiMicOff size={24} />}
                </button>
              </div>
            </div>

            <div className="glass-panel">
              <h4 style={{ marginBottom: '10px' }}>Answer Capture</h4>
              <textarea 
                className="input-field" 
                rows="4" 
                placeholder={isRecording ? "Listening..." : "Click the mic to speak, or type your answer manually..."}
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={submitAnswer} disabled={isProcessingAI || !speechText.trim()}>
                  <FiSend /> Send Answer
                </button>
                <button className="btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={finishInterview}>
                  End Interview & Grade
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Chat/AI Interviewer Box */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>Technical Interviewer</h3>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {transcriptData.map((msg, index) => (
                <div key={index} style={{ 
                  alignSelf: msg.role === 'ai' ? 'flex-start' : 'flex-end',
                  background: msg.role === 'ai' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: msg.role === 'ai' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '15px',
                  borderRadius: '12px',
                  maxWidth: '85%'
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    {msg.role === 'ai' ? 'Hiring Manager' : 'You'}
                  </div>
                  <div style={{ lineHeight: '1.5' }}>{msg.text}</div>
                </div>
              ))}
              
              {isProcessingAI && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px' }}>
                  Manager is evaluating your response...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {interviewFinished && finalReport && (
        <div className="glass-panel" style={{ animation: 'fadeIn 0.5s ease', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2>Interview Complete!</h2>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              color: finalReport.score > 70 ? 'var(--success)' : 'var(--accent-color)',
              margin: '15px 0'
            }}>
              Final Grade: {finalReport.score}/100
            </div>
          </div>
          
          <h4>Performance Feedback:</h4>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginTop: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {finalReport.feedback}
          </div>

          <button className="btn-primary" style={{ marginTop: '30px', width: '100%' }} onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default MockInterview;
