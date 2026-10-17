import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Upload, FileText, CheckCircle, XCircle, AlertCircle, 
  Briefcase, Code, Database, Globe, Brain, Cloud, 
  TrendingUp, History, Sparkles, LogOut,
  Sun, Moon, Info, ChevronRight, Lightbulb, Zap,
  Target, Trash2, Printer, Search, CheckSquare, ArrowUpRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ═══════════════════════════════════════
   RADIAL SCORE RING
   ═══════════════════════════════════════ */
function RadialProgress({ value, title, subText, color }) {
  const radius = 33;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  const getBadge = (val) => {
    if (val >= 85) return { label: 'Excellent', cls: 'excellent' };
    if (val >= 70) return { label: 'Good', cls: 'good' };
    if (val >= 50) return { label: 'Needs Work', cls: 'needs-work' };
    return { label: 'Poor', cls: 'poor' };
  };
  const badge = getBadge(value);

  return (
    <div className="score-widget">
      <div className="radial-progress">
        <svg className="radial-svg" viewBox="0 0 80 80">
          <circle className="radial-circle-bg" cx="40" cy="40" r={radius} />
          <circle
            className="radial-circle-val"
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
          />
        </svg>
        <span className="radial-text" style={{ color }}>{value}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <h4 className="score-meta-title">{title}</h4>
        <p className="score-meta-desc">{subText}</p>
        <span className={`score-badge ${badge.cls}`}>{badge.label}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   INFO TOOLTIP
   ═══════════════════════════════════════ */
function InfoTooltip({ text, score, max }) {
  const [visible, setVisible] = useState(false);
  const isDeducted = score < max;
  const message = isDeducted 
    ? `Deduction Reason: ${text}` 
    : "Perfect score! This section is fully optimized and meets all criteria.";

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        aria-label={`Info: ${isDeducted ? 'Points deducted' : 'Full score'}`}
        onClick={(e) => { e.stopPropagation(); setVisible(!visible); }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: isDeducted ? 'var(--color-warning)' : 'var(--color-text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '50%',
          transition: 'color var(--transition-fast)'
        }}
      >
        <Info size={14} />
      </button>
      
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          right: '-4px',
          background: 'var(--color-popover)',
          color: 'var(--color-popover-text)',
          border: '1px solid var(--color-border)',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          width: '240px',
          boxShadow: 'var(--shadow-popover)',
          zIndex: 100,
          pointerEvents: 'none',
          lineHeight: '1.5',
          textAlign: 'left',
          fontWeight: 'normal',
          textTransform: 'none'
        }}>
          {message}
          <span style={{
            position: 'absolute',
            top: '100%',
            right: '10px',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--color-popover)',
          }} />
        </span>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════
   BREAKDOWN BAR
   ═══════════════════════════════════════ */
function BreakdownBar({ label, score, max, deductionMessage }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const isFull = score >= max;
  
  return (
    <div className="breakdown-item">
      <div className="breakdown-label">
        <span>{label}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <strong>{score} / {max}</strong>
          <InfoTooltip text={deductionMessage} score={score} max={max} />
        </span>
      </div>
      <div className="breakdown-track">
        <div 
          className={`breakdown-bar ${isFull ? 'full' : ''}`} 
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   DEDUCTION MESSAGE HELPERS
   ═══════════════════════════════════════ */
const getSkillsDeductionMessage = (score) => {
  const count = Math.round(score / 3);
  if (score === 0) return "No relevant technical keywords detected. Add at least 10 technical skills (each adds 3 marks).";
  if (score < 30) return `Only ${count} relevant technical keywords found. Add ${10 - count} more skills (3 marks each) to recover ${30 - score} marks.`;
  return "";
};

const getProjectsDeductionMessage = (score) => {
  if (score === 0) return "No distinct 'Projects' section found (worth 15 marks). Create one and list your projects.";
  if (score === 15) return "Projects section found (15 marks), but lacks GitHub links or detailed descriptions. Add links or describe 2+ projects.";
  return "";
};

const getExperienceDeductionMessage = (score) => {
  if (score === 0) return "No distinct 'Experience' section found (worth 12 marks). Add one to outline your background.";
  if (score === 12) return "Experience section detected (12 marks), but lacks strong action verbs. Use 'designed', 'optimized', 'led', etc.";
  return "";
};

const getEducationDeductionMessage = (score) => {
  if (score === 0) return "No clear 'Education' section found (worth 10 marks). Add your academic background.";
  if (score === 10) return "Education section detected (10 marks), but degree keywords not parsed. Specify B.Tech, MS, PhD, etc.";
  return "";
};

const getCertificationsDeductionMessage = (score) => {
  if (score === 0) return "No 'Certifications' section found (worth 10 marks). List your professional credentials.";
  return "";
};

/* ═══════════════════════════════════════
   INSIGHT GENERATOR
   ═══════════════════════════════════════ */
function getTopInsight(analysis) {
  if (!analysis?.score_breakdown) return null;
  const bd = analysis.score_breakdown;
  
  const items = [
    { label: 'Technical Skills', score: bd.skills || 0, max: 30 },
    { label: 'Projects', score: bd.projects || 0, max: 25 },
    { label: 'Experience', score: bd.experience || 0, max: 20 },
    { label: 'Education', score: bd.education || 0, max: 15 },
    { label: 'Certifications', score: bd.certifications || 0, max: 10 },
  ];
  
  const sorted = [...items].sort((a, b) => (a.score / a.max) - (b.score / b.max));
  const worst = sorted[0];
  const gap = worst.max - worst.score;
  
  if (gap === 0) return { text: "Your resume is well-optimized across all sections. Focus on tailoring it to specific job descriptions.", type: 'success' };
  return { text: `Highest impact action: "${worst.label}" is missing ${gap} points. Addressing this section will provide the largest score increase.`, type: 'action' };
}

/* ═══════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════ */
export default function Dashboard({ user, token, onLogout, isDark, onToggleTheme, onOpenAuth }) {
  const [history, setHistory] = useState([]);
  const [guestHistory, setGuestHistory] = useState([]);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [jdText, setJdText] = useState('');
  const [matchingJd, setMatchingJd] = useState(false);
  const [jdResult, setJdResult] = useState(null);
  const [jdError, setJdError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Skills filter & search
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('All');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  // Fetch History on Load
  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/dashboard/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
        if (data.history && data.history.length > 0 && !activeAnalysis) {
          setActiveAnalysis(data.history[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Delete resume from history
  const handleDeleteResume = async (e, resumeId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this resume analysis from history?')) return;

    if (!token) {
      const remaining = guestHistory.filter(item => item.resume_id !== resumeId);
      setGuestHistory(remaining);
      if (activeAnalysis?.resume_id === resumeId) {
        setActiveAnalysis(remaining.length > 0 ? remaining[0] : null);
        setJdResult(null);
        setJdText('');
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/resume/${resumeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const remaining = history.filter(item => item.resume_id !== resumeId);
        setHistory(remaining);
        if (activeAnalysis?.resume_id === resumeId) {
          setActiveAnalysis(remaining.length > 0 ? remaining[0] : null);
          setJdResult(null);
          setJdText('');
        }
      }
    } catch (err) {
      console.error('Failed to delete resume:', err);
    }
  };

  // Upload handler
  const processFile = async (file) => {
    if (!file) return;
    const validTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Please upload PDF, DOCX, DOC, or TXT.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setJdResult(null);
    setJdText('');

    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Analysis failed');

      setActiveAnalysis(data.data);
      if (token) {
        await fetchHistory();
      } else {
        setGuestHistory(prev => [data.data, ...prev.filter(item => item.resume_id !== data.data.resume_id)]);
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e) => processFile(e.target.files?.[0]);

  // Drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [token]);

  // JD Compare
  const handleJdMatch = async (e) => {
    e.preventDefault();
    if (!jdText.trim() || !activeAnalysis) return;

    setMatchingJd(true);
    setJdError('');
    setJdResult(null);

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}/resume/compare`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          job_description: jdText,
          resume_id: activeAnalysis.resume_id,
          resume_text: activeAnalysis.resume_text || ''
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Comparison failed');
      setJdResult(data);
    } catch (err) {
      setJdError(err.message);
    } finally {
      setMatchingJd(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getSkillCategoryIcon = (category) => {
    const icons = {
      'Programming Languages': <Code size={15} />,
      'Frontend Development': <Globe size={15} />,
      'Backend Development': <Briefcase size={15} />,
      'Database & Storage': <Database size={15} />,
      'Cloud & DevOps': <Cloud size={15} />,
      'AI & Data Science': <Brain size={15} />
    };
    return icons[category] || <Code size={15} />;
  };

  // Filter skills by category & search query
  const filteredSkillsByCategory = useMemo(() => {
    if (!activeAnalysis?.skills_by_category) return {};
    const result = {};
    const query = skillSearchQuery.toLowerCase().trim();

    Object.entries(activeAnalysis.skills_by_category).forEach(([category, skills]) => {
      if (skillCategoryFilter !== 'All' && category !== skillCategoryFilter) return;
      const matched = query ? skills.filter(s => s.toLowerCase().includes(query)) : skills;
      if (matched.length > 0) {
        result[category] = matched;
      }
    });

    return result;
  }, [activeAnalysis, skillCategoryFilter, skillSearchQuery]);

  const skillCategories = useMemo(() => {
    if (!activeAnalysis?.skills_by_category) return [];
    return Object.keys(activeAnalysis.skills_by_category);
  }, [activeAnalysis]);

  const insight = getTopInsight(activeAnalysis);
  const displayHistory = token ? history : guestHistory;

  return (
    <div>
      {/* ─── NAVBAR ─── */}
      <header className="navbar">
        <div className="nav-brand">
          <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
          Resume Analyzer
        </div>
        <div className="nav-user">
          <button 
            onClick={onToggleTheme} 
            className="btn-ghost"
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              borderRadius: '50%',
              transition: 'color var(--transition-fast)'
            }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              <span className="nav-username">
                {user?.name}
              </span>
              <button className="nav-logout" onClick={onLogout} aria-label="Sign out">
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="btn-nav-signin"
                aria-label="Sign in"
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('register')}
                className="btn-nav-getstarted"
                aria-label="Get started"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── DASHBOARD ─── */}
      <div className="dashboard-container">
        <div className="dashboard-grid">
          
          {/* ─── LEFT SIDEBAR ─── */}
          <div className="sidebar-panel">
            {/* Upload Zone */}
            <div className="card">
              <h3 className="section-title">
                <Upload size={15} />
                Analyze Resume
              </h3>
              <div 
                className={`upload-zone ${isDragging ? 'dragging' : ''}`} 
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Upload resume file"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); }}}
                style={{ pointerEvents: uploading ? 'none' : 'auto' }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  aria-hidden="true"
                />
                <Upload className="upload-icon" />
                <p className="upload-text">
                  {uploading ? 'Analyzing...' : isDragging ? 'Drop file here' : 'Upload Resume'}
                </p>
                <p className="upload-hint">
                  {uploading ? 'Parsing sections & NLP rules...' : 'PDF, DOCX, DOC, or TXT · Max 10MB'}
                </p>
                {uploading && (
                  <div className="upload-progress">
                    <div className="upload-progress-bar" />
                  </div>
                )}
              </div>

              {uploadError && <div className="alert-error">{uploadError}</div>}
            </div>

            {/* History */}
            <div className="card">
              <h3 className="section-title">
                <History size={15} />
                Recent Analyses
                {displayHistory.length > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-surface-alt)',
                    padding: '1px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>{displayHistory.length}</span>
                )}
              </h3>

              {!user && (
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--color-primary-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginBottom: 'var(--space-3)',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: '2px' }}>
                    Guest Mode
                  </span>
                  Analyzing as guest. <button type="button" onClick={() => onOpenAuth && onOpenAuth('register')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Sign up</button> to save your resume history permanently.
                </div>
              )}

              {displayHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-6) 0' }}>
                  No resumes uploaded yet.
                </p>
              ) : (
                <div className="history-list">
                  {displayHistory.map((item) => (
                    <div 
                      key={item.resume_id} 
                      className={`history-item ${activeAnalysis?.resume_id === item.resume_id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveAnalysis(item);
                        setJdResult(null);
                        setJdText('');
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View analysis for ${item.filename}`}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setActiveAnalysis(item); setJdResult(null); setJdText(''); }}}
                    >
                      <div className="history-item-header">
                        <span className="history-filename" title={item.filename}>
                          {item.filename}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span 
                            className="history-score"
                            style={{
                              background: item.score >= 80 ? 'var(--color-success-subtle)' : item.score >= 50 ? 'var(--color-warning-subtle)' : 'var(--color-danger-subtle)',
                              color: item.score >= 80 ? 'var(--color-success)' : item.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                            }}
                          >
                            {item.score}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteResume(e, item.resume_id)}
                            aria-label={`Delete ${item.filename}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: '4px',
                              transition: 'color var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                            title="Delete this analysis"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <span className="history-date">
                        {formatDate(item.upload_date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── MAIN CONTENT ─── */}
          <div className="analysis-main">
            {activeAnalysis ? (
              <>
                {/* ── Evaluation Card ── */}
                <div className="card">
                  <div className="report-header">
                    <div className="report-header-info">
                      <h2>{activeAnalysis.filename}</h2>
                      <span className="report-header-meta">
                        Analyzed {formatDate(activeAnalysis.upload_date)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn btn-secondary"
                      style={{ minHeight: '36px', padding: '6px 14px', fontSize: '13px' }}
                      title="Print or export as PDF"
                    >
                      <Printer size={14} />
                      Export PDF
                    </button>
                  </div>

                  {/* Scores */}
                  <div className="scores-section">
                    <RadialProgress 
                      value={activeAnalysis.score} 
                      title="Resume Score" 
                      subText="Skills, formatting & achievements" 
                      color="var(--color-primary)"
                    />
                    <RadialProgress 
                      value={activeAnalysis.ats_score} 
                      title="ATS Score" 
                      subText="Tracking system readability" 
                      color="var(--color-accent)"
                    />
                  </div>

                  {/* Top Insight */}
                  {insight && (
                    <div className="insight-card" style={{ marginTop: 'var(--space-5)' }}>
                      <Lightbulb size={18} className="insight-icon" />
                      <p>{insight.text}</p>
                    </div>
                  )}

                  {/* Breakdown */}
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <h4 className="breakdown-section-title">Score Breakdown</h4>
                    <div className="breakdown-bars">
                      <BreakdownBar 
                        label="Technical Skills" 
                        score={activeAnalysis.score_breakdown?.skills || 0} 
                        max={30} 
                        deductionMessage={getSkillsDeductionMessage(activeAnalysis.score_breakdown?.skills || 0)}
                      />
                      <BreakdownBar 
                        label="Projects" 
                        score={activeAnalysis.score_breakdown?.projects || 0} 
                        max={25} 
                        deductionMessage={getProjectsDeductionMessage(activeAnalysis.score_breakdown?.projects || 0)}
                      />
                      <BreakdownBar 
                        label="Experience" 
                        score={activeAnalysis.score_breakdown?.experience || 0} 
                        max={20} 
                        deductionMessage={getExperienceDeductionMessage(activeAnalysis.score_breakdown?.experience || 0)}
                      />
                      <BreakdownBar 
                        label="Education" 
                        score={activeAnalysis.score_breakdown?.education || 0} 
                        max={15} 
                        deductionMessage={getEducationDeductionMessage(activeAnalysis.score_breakdown?.education || 0)}
                      />
                      <BreakdownBar 
                        label="Certifications" 
                        score={activeAnalysis.score_breakdown?.certifications || 0} 
                        max={10} 
                        deductionMessage={getCertificationsDeductionMessage(activeAnalysis.score_breakdown?.certifications || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Skills Card ── */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>
                      <Code size={18} />
                      Identified Technical Skills
                      {activeAnalysis.skills && activeAnalysis.skills.length > 0 && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--color-text-muted)'
                        }}>
                          ({activeAnalysis.skills.length} detected)
                        </span>
                      )}
                    </h3>

                    {/* Search box */}
                    <div style={{ position: 'relative', width: '200px' }}>
                      <Search size={14} style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)'
                      }} />
                      <input
                        type="text"
                        placeholder="Search skills..."
                        value={skillSearchQuery}
                        onChange={(e) => setSkillSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          fontSize: '12px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  {skillCategories.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-4)' }}>
                      <button
                        type="button"
                        onClick={() => setSkillCategoryFilter('All')}
                        style={{
                          background: skillCategoryFilter === 'All' ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                          color: skillCategoryFilter === 'All' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-full)',
                          padding: '3px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        All Categories
                      </button>
                      {skillCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSkillCategoryFilter(cat)}
                          style={{
                            background: skillCategoryFilter === cat ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                            color: skillCategoryFilter === cat ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {Object.keys(filteredSkillsByCategory).length === 0 ? (
                    <div style={{
                      padding: 'var(--space-6)',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '14px',
                      background: 'var(--color-surface-alt)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <Code size={24} style={{ marginBottom: 'var(--space-2)', opacity: 0.4 }} />
                      <p>{skillSearchQuery ? 'No skills matched your search filter.' : 'No programming keywords matched standard technology list.'}</p>
                    </div>
                  ) : (
                    <div className="skills-grid">
                      {Object.entries(filteredSkillsByCategory).map(([category, items]) => (
                        <div key={category} className="skill-category-card">
                          <h4 className="skill-category-title">
                            {getSkillCategoryIcon(category)}
                            {category}
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: 'var(--color-text-muted)'
                            }}>{items.length}</span>
                          </h4>
                          <div className="skills-tags-container">
                            {items.map(skill => (
                              <span key={skill} className="skill-tag">{skill}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── ATS Compliance ── */}
                <div className="card">
                  <h3 className="card-title">
                    <TrendingUp size={18} />
                    ATS Compatibility Checks
                    {activeAnalysis.ats_checks && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--color-text-muted)'
                      }}>
                        {activeAnalysis.ats_checks.filter(c => c.status === 'pass').length}/{activeAnalysis.ats_checks.length} passed
                      </span>
                    )}
                  </h3>
                  <div className="ats-check-grid">
                    {activeAnalysis.ats_checks?.map((check, idx) => (
                      <div 
                        key={idx} 
                        className={`ats-check-card ${check.status === 'pass' ? 'pass' : 'fail'}`}
                      >
                        {check.status === 'pass' ? (
                          <CheckCircle className="ats-check-status-icon pass" />
                        ) : (
                          <XCircle className="ats-check-status-icon fail" />
                        )}
                        <div className="ats-check-info">
                          <span className="ats-check-label">{check.label}</span>
                          <span className="ats-check-desc">{check.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Suggestions & High-Impact Rewrites ── */}
                <div className="card">
                  <h3 className="card-title" style={{ color: 'var(--color-warning)' }}>
                    <AlertCircle size={18} />
                    <span style={{ color: 'var(--color-text)' }}>Recommendations for Improvement</span>
                    {activeAnalysis.suggestions && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--color-text-muted)'
                      }}>
                        {activeAnalysis.suggestions.length} items
                      </span>
                    )}
                  </h3>
                  <div className="suggestions-list">
                    {activeAnalysis.suggestions?.map((suggestion, idx) => (
                      <div key={idx} className="suggestion-item">
                        <span className="suggestion-bullet">
                          <ChevronRight size={14} />
                        </span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actionable Rewrite Example Guide */}
                  <div style={{
                    marginTop: 'var(--space-5)',
                    padding: 'var(--space-4)',
                    background: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <CheckSquare size={14} style={{ color: 'var(--color-primary)' }} />
                      Pro Tip: The Google XYZ Resume Formula
                    </h5>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                      Format bullet points as: <strong>"Accomplished [X] as measured by [Y] by doing [Z]"</strong>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                      <div style={{ padding: '8px 10px', background: 'var(--color-danger-subtle)', borderRadius: '6px', border: '1px solid var(--color-danger)' }}>
                        <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Weak:</span>
                        "Responsible for maintaining backend APIs and database."
                      </div>
                      <div style={{ padding: '8px 10px', background: 'var(--color-success-subtle)', borderRadius: '6px', border: '1px solid var(--color-success)' }}>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Strong:</span>
                        "Architected 12 RESTful microservices with Node.js & MongoDB, slashing query latency by 45% for 80k+ daily users."
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Job Description Matching ── */}
                <div className="card">
                  <h3 className="card-title">
                    <Target size={18} />
                    Job Description Match Engine
                  </h3>
                  <form onSubmit={handleJdMatch} className="jd-panel">
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Paste a target job posting below to evaluate how closely this resume aligns with required qualifications and detect missing keywords.
                    </p>
                    <textarea
                      placeholder="e.g. We are looking for a Senior Full Stack Engineer experienced with TypeScript, Python, AWS, Docker, and PostgreSQL. Must have strong understanding of CI/CD and distributed systems..."
                      className="jd-textarea"
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      required
                      aria-label="Job description text"
                    />
                    <div>
                      <button 
                        type="submit" 
                        className={`btn btn-primary ${matchingJd ? 'btn-disabled' : ''}`}
                        disabled={matchingJd}
                        style={{ width: 'auto' }}
                      >
                        {matchingJd ? (
                          <>
                            <span className="loading-spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} />
                            Calculating Match...
                          </>
                        ) : (
                          <>
                            <Zap size={15} />
                            Calculate Match Score
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {jdError && <div className="alert-error">{jdError}</div>}

                  {jdResult && (
                    <div className="jd-results-grid">
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          fontSize: '36px', 
                          fontFamily: 'var(--font-display)', 
                          fontWeight: '800', 
                          color: jdResult.match_percentage >= 75 ? 'var(--color-success)' : jdResult.match_percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                          lineHeight: 1
                        }}>
                          {jdResult.match_percentage}%
                        </div>
                        <span style={{ 
                          fontSize: '11px', 
                          color: 'var(--color-text-muted)', 
                          textTransform: 'uppercase', 
                          fontWeight: 700,
                          letterSpacing: '0.05em'
                        }}>
                          Match Rating
                        </span>
                      </div>
                      
                      <div className="jd-skills-summary">
                        <div>
                          <h5 className="jd-matching-skills-title">
                            Matching Credentials ({jdResult.matching_skills?.length || 0})
                          </h5>
                          {jdResult.matching_skills && jdResult.matching_skills.length === 0 ? (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No direct skill matches found in description.</span>
                          ) : (
                            <div className="skills-tags-container">
                              {jdResult.matching_skills?.map(skill => (
                                <span key={skill} className="skill-tag skill-tag-matching">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h5 className="jd-missing-skills-title">
                            Missing Keywords ({jdResult.missing_skills?.length || 0})
                          </h5>
                          {jdResult.missing_skills && jdResult.missing_skills.length === 0 ? (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Perfect skill coverage for this posting!</span>
                          ) : (
                            <div className="skills-tags-container">
                              {jdResult.missing_skills?.map(skill => (
                                <span key={skill} className="skill-tag skill-tag-missing">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="card empty-state">
                <FileText className="empty-state-icon" />
                <h2>No Resume Analyzed Yet</h2>
                <p>
                  Upload a resume on the left panel to trigger comprehensive score evaluation, ATS compliance checking, and job matching.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
