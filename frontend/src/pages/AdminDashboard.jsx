import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiFileText, FiVideo, FiShield } from 'react-icons/fi';
import axios from 'axios';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));
    
    if (!token || userData?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    axios.get('http://localhost:5000/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setStats(res.data.stats);
      setUsers(res.data.users);
    })
    .catch(err => {
      setError(err.response?.data?.message || 'Access Denied');
    });

  }, [navigate]);

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <FiShield size={60} color="var(--danger)" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>Return to User View</button>
      </div>
    );
  }

  if (!stats) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading Admin Panel...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div className="page-header" style={{ marginTop: '30px', textAlign: 'left', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <FiShield size={40} color="var(--accent-color)" />
        <div>
          <h2 className="page-title" style={{ fontSize: '2rem', margin: 0 }}>System Control Panel</h2>
          <p className="page-subtitle" style={{ marginLeft: 0 }}>Administrator oversight dashboard.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid-3" style={{ gap: '20px', marginTop: '40px' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '50%' }}>
            <FiUsers size={30} color="#8B5CF6" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-secondary)' }}>Total Users</h4>
            <h2 style={{ margin: 0 }}>{stats.totalUsers}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '50%' }}>
            <FiFileText size={30} color="var(--accent-color)" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-secondary)' }}>Resumes Analyzed</h4>
            <h2 style={{ margin: 0 }}>{stats.totalResumes}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '50%' }}>
            <FiVideo size={30} color="#10B981" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-secondary)' }}>Interviews Done</h4>
            <h2 style={{ margin: 0 }}>{stats.totalInterviews}</h2>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="glass-panel" style={{ marginTop: '40px' }}>
        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px', marginBottom: '20px' }}>Registered Candidate Metrics</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '15px 10px' }}>ID</th>
                <th style={{ padding: '15px 10px' }}>Name</th>
                <th style={{ padding: '15px 10px' }}>Email</th>
                <th style={{ padding: '15px 10px' }}>Role</th>
                <th style={{ padding: '15px 10px' }}>Resumes</th>
                <th style={{ padding: '15px 10px' }}>Interviews</th>
                <th style={{ padding: '15px 10px' }}>Average Mock Grade</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '15px 10px' }}>{u.id}</td>
                  <td style={{ padding: '15px 10px', fontWeight: '500' }}>{u.name}</td>
                  <td style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '15px 10px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem',
                      background: u.role === 'admin' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)',
                      color: u.role === 'admin' ? 'var(--accent-color)' : 'var(--text-primary)'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>{u.resumesAnalyzed}</td>
                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>{u.interviewsTaken}</td>
                  <td style={{ padding: '15px 10px' }}>
                    {u.interviewsTaken > 0 ? (
                      <span style={{ color: u.averageInterviewScore >= 70 ? 'var(--success)' : (u.averageInterviewScore >= 50 ? 'orange' : 'var(--danger)')}}>
                        {u.averageInterviewScore}/100
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
