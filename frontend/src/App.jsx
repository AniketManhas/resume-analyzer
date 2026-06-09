import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('resume_analyzer_token');
    const savedUser = localStorage.getItem('resume_analyzer_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Simple expiry verification
        const decoded = JSON.parse(atob(savedToken.split('.')[1]));
        const expTime = decoded.exp * 1000;
        
        if (Date.now() < expTime) {
          setToken(savedToken);
          setUser(parsedUser);
        } else {
          // Token expired, clear storage
          localStorage.removeItem('resume_analyzer_token');
          localStorage.removeItem('resume_analyzer_user');
        }
      } catch (e) {
        console.error('Error restoring session:', e);
        localStorage.removeItem('resume_analyzer_token');
        localStorage.removeItem('resume_analyzer_user');
      }
    }
    setCheckingSession(false);
  }, []);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('resume_analyzer_dark');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    localStorage.setItem('resume_analyzer_dark', JSON.stringify(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleAuthSuccess = (authUser, authToken) => {
    setUser(authUser);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('resume_analyzer_token');
    localStorage.removeItem('resume_analyzer_user');
    setUser(null);
    setToken(null);
  };

  if (checkingSession) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: '1rem'
      }}>
        <div className="loading-spinner" style={{ margin: 0 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Session...</span>
      </div>
    );
  }

  return (
    <>
      {user && token ? (
        <Dashboard 
          user={user} 
          token={token} 
          onLogout={handleLogout} 
          isDark={isDark} 
          onToggleTheme={() => setIsDark(!isDark)} 
        />
      ) : (
        <Auth 
          onAuthSuccess={handleAuthSuccess} 
          isDark={isDark} 
          onToggleTheme={() => setIsDark(!isDark)} 
        />
      )}
    </>
  );
}
