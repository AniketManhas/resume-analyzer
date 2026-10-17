import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Sun, Moon, X } from 'lucide-react';
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Auth({ onAuthSuccess, isDark, onToggleTheme, initialMode = 'login', onClose }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLogin(initialMode !== 'register');
    setError('');
  }, [initialMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please try again.');
      }

      localStorage.setItem('resume_analyzer_token', data.token);
      localStorage.setItem('resume_analyzer_user', JSON.stringify(data.user));
      
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Firebase Sign-In Redirect Results on page load
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          setError('');
          const token = await result.user.getIdToken();

          const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: token })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Google authentication failed.');
          }

          localStorage.setItem('resume_analyzer_token', data.token);
          localStorage.setItem('resume_analyzer_user', JSON.stringify(data.user));
          
          onAuthSuccess(data.user, data.token);
        }
      } catch (err) {
        console.error("Redirect auth error:", err);
        setError(err.message || 'Google authentication failed.');
      } finally {
        setLoading(false);
      }
    };
    handleRedirectResult();
  }, [onAuthSuccess]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const content = (
    <div className="card auth-card" style={{ position: 'relative', width: '100%', maxWidth: '440px', margin: 'auto' }}>
      {/* Close button if in modal */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--space-4)',
            left: 'var(--space-4)',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--transition-fast)'
          }}
          title="Close"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      )}

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        style={{
          position: 'absolute',
          top: 'var(--space-4)',
          right: 'var(--space-4)',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color var(--transition-fast)'
        }}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)', marginTop: onClose ? 'var(--space-2)' : 0 }}>
        <div style={{
          background: 'var(--color-primary-subtle)',
          color: 'var(--color-primary)',
          padding: '12px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldCheck size={32} />
        </div>
      </div>

      <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
      <p className="auth-subtitle">
        {isLogin ? 'Sign in to access your saved resume history & insights' : 'Get started with free resume scoring and ATS optimization'}
      </p>

      {error && (
        <div className="alert-error" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)'
              }} />
              <input
                id="name-input"
                type="text"
                placeholder="John Doe"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email-input">Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)'
            }} />
            <input
              id="email-input"
              type="email"
              placeholder="name@example.com"
              className="form-input"
              style={{ paddingLeft: '40px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password-input">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)'
            }} />
            <input
              id="password-input"
              type="password"
              placeholder="••••••••"
              className="form-input"
              style={{ paddingLeft: '40px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}
          disabled={loading}
          style={{ width: '100%', marginTop: 'var(--space-2)' }}
        >
          {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: 'var(--space-4) 0',
        color: 'var(--color-text-muted)',
        fontSize: '12px'
      }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></span>
        <span style={{ padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className={`btn btn-secondary ${loading ? 'btn-disabled' : ''}`}
        style={{ width: '100%' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '6px' }}>
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.938 5.48 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.549 0 9s.347 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.579c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.48 0 2.438 2.062.957 5.039l3.007 2.332C4.672 5.163 6.656 3.579 9 3.579z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <div style={{
        marginTop: 'var(--space-5)',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--color-text-secondary)'
      }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            fontWeight: '600',
            padding: '0 4px',
            fontFamily: 'inherit',
            fontSize: 'inherit'
          }}
        >
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
          overflowY: 'auto'
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {content}
    </div>
  );
}
