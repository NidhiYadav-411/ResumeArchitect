import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiFileText, FiLogOut, FiUser } from 'react-icons/fi';

const Navbar = () => {
  const navigate = useNavigate();
  // We'll use localStorage for simple auth state for now
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <FiFileText size={24} color="#3B82F6" />
        Resume Architect
      </Link>
      
      <div className="navbar-links">
        {token ? (
          <>
            <Link to="/analytics" className="nav-item btn-secondary">Analytics</Link>
            <Link to="/interview" className="nav-item btn-secondary">Mock Interview</Link>
            {user?.role === 'admin' && (
               <Link to="/admin" className="nav-item btn-secondary" style={{ borderColor: 'var(--accent-color)' }}>Admin</Link>
            )}
            <Link to="/dashboard" className="nav-item btn-primary" style={{ background: 'transparent', border: '1px solid var(--accent-color)' }}>
              <FiUser /> {user?.name || 'Dashboard'}
            </Link>
            <button onClick={handleLogout} className="btn-primary" style={{ background: '#EF4444' }}>
              <FiLogOut /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-item btn-secondary">Login</Link>
            <Link to="/register" className="btn-primary">Sign Up Free</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
