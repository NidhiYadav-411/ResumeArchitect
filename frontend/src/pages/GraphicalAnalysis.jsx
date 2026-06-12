import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import axios from 'axios';

const GraphicalAnalysis = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    
    axios.get('http://localhost:5000/api/resume', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      setResumes(response.data.reverse()); // Chronological 
    }).catch(err => console.error(err));
  }, [navigate]);

  // Data mapping for Line Chart
  const progressData = resumes.map((r, i) => ({
    name: `Upload ${i + 1}`,
    score: r.atsScore?.score || 0
  }));

  // Simulate spider map data from latest resume missing keywords logic
  // (In a real app, the backend would pass explicit category scores)
  const spiderData = [
    { subject: 'Technical Depth', A: Math.min(100, (resumes[resumes.length - 1]?.atsScore?.score || 50) + 10), fullMark: 100 },
    { subject: 'Leadership', A: 75, fullMark: 100 },
    { subject: 'Keywords Match', A: resumes[resumes.length - 1]?.atsScore?.score || 0, fullMark: 100 },
    { subject: 'Format & Spelling', A: 90, fullMark: 100 },
    { subject: 'Impact Metric', A: 65, fullMark: 100 },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div className="page-header" style={{ marginTop: '30px', textAlign: 'left' }}>
        <h2 className="page-title" style={{ fontSize: '2rem' }}>Graphical Diagnostics</h2>
        <p className="page-subtitle" style={{ marginLeft: 0 }}>Visualize your structural momentum and skill maps over time.</p>
      </div>

      <div className="grid-2" style={{ gap: '40px', marginTop: '30px' }}>
        {/* ATS Progress Tracker */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3 style={{ marginBottom: '20px' }}>ATS Iteration Progression</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#A1A1AA" />
              <YAxis domain={[0, 100]} stroke="#A1A1AA" />
              <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} activeDot={{ r: 8 }} name="ATS Match Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Gap Spider Chart */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3 style={{ marginBottom: '20px' }}>Competency Radars (Latest Resume)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={spiderData}>
              <PolarGrid stroke="rgba(255,255,255,0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#EDEDED', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#A1A1AA' }} />
              <Radar name="Candidate Profiling" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
              <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default GraphicalAnalysis;
