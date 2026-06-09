import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, XCircle, AlertCircle, 
  Briefcase, Code, Database, Globe, Brain, Cloud, 
  TrendingUp, HelpCircle, History, Sparkles, LogOut,
  Sun, Moon, Info
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// SVG Radial Score progress ring component
function RadialProgress({ value, title, subText, color, glow }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="score-widget">
      <div className="radial-progress">
        <svg className="radial-svg" viewBox="0 0 100 100">
          <circle className="radial-circle-bg" cx="50" cy="50" r={radius} />
          <circle
            className="radial-circle-val"
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
            style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
          />
        </svg>
        <span className="radial-text" style={{ color: color }}>{value}</span>
      </div>
      <div>
        <h4 className="score-meta-title">{title}</h4>
        <p className="score-meta-desc">{subText}</p>
      </div>
    </div>
  );
}

// Info button with custom hover/click tooltip component
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
        onClick={(e) => {
          e.stopPropagation();
          setVisible(!visible);
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: isDeducted ? 'var(--warning)' : 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'var(--transition-smooth)'
        }}
        title="View details"
      >
        <Info size={14} />
      </button>
      
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: '125%',
          right: '0px',
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border-light)',
          padding: '0.6rem 0.8rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          width: '260px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)',
          zIndex: 100,
          pointerEvents: 'none',
          lineHeight: '1.4',
          textAlign: 'left',
          fontWeight: 'normal',
          textTransform: 'none'
        }}>
          {message}
          {/* Arrow */}
          <span style={{
            position: 'absolute',
            top: '100%',
            right: '8px',
            width: '0',
            height: '0',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--popover)',
            transform: 'translateX(0)'
          }} />
          {/* Border overlay for arrow */}
          <span style={{
            position: 'absolute',
            top: '100%',
            right: '8px',
            width: '0',
            height: '0',
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid var(--border-light)',
            zIndex: -1,
            transform: 'translate(1px, 0)'
          }} />
        </span>
      )}
    </span>
  );
}

// Helper functions for dynamic score deductions
const getSkillsDeductionMessage = (score) => {
  const count = Math.round(score / 3);
  if (score === 0) {
    return "No relevant technical keywords from our list were detected. Add at least 10 technical skills (each adds 3 marks) to get full marks.";
  }
  if (score < 30) {
    return `Only ${count} relevant technical keywords were found. Add ${10 - count} more skills (3 marks per skill) to recover the remaining ${30 - score} marks.`;
  }
  return "";
};

const getProjectsDeductionMessage = (score) => {
  if (score === 0) {
    return "No distinct 'Projects' section was found (worth 15 marks). Create one and list your projects.";
  }
  if (score === 15) {
    return "Projects section found (15 marks), but lacks GitHub links or multiple detailed project descriptions. Add a github.com link or describe at least 2 distinct projects using verbs like 'built' or 'implemented' to gain the remaining 10 marks.";
  }
  return "";
};

const getExperienceDeductionMessage = (score) => {
  if (score === 0) {
    return "No distinct 'Experience' section was found (worth 12 marks). Add one to outline your professional background.";
  }
  if (score === 12) {
    return "Experience section detected (12 marks), but it lacks strong impact-driven action verbs. Begin your experience bullets with at least 2 action verbs (e.g., 'designed', 'optimized', 'managed', 'led') to gain the remaining 8 marks.";
  }
  return "";
};

const getEducationDeductionMessage = (score) => {
  if (score === 0) {
    return "No clear 'Education' section was found (worth 10 marks). Add an Education section to display your academic background.";
  }
  if (score === 10) {
    return "Education section detected (10 marks), but standard degree keywords (B.Tech, M.Tech, BS, MS, PhD, etc.) were not parsed. Specify your degree title clearly to get the remaining 5 marks.";
  }
  return "";
};

const getCertificationsDeductionMessage = (score) => {
  if (score === 0) {
    return "No distinct 'Certifications' section was found (worth 10 marks). List your professional courses, credentials, or licenses to gain these marks.";
  }
  return "";
};

export default function Dashboard({ user, token, onLogout, isDark, onToggleTheme }) {
  const [history, setHistory] = useState([]);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [jdText, setJdText] = useState('');
  const [matchingJd, setMatchingJd] = useState(false);
  const [jdResult, setJdResult] = useState(null);
  const [jdError, setJdError] = useState('');
  
  const fileInputRef = useRef(null);

  // Fetch History on Load
  useEffect(() => {
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
        if (data.history && data.history.length > 0 && !activeAnalysis) {
          // Default to latest analysis
          setActiveAnalysis(data.history[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Upload file handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setJdResult(null);
    setJdText('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Analysis failed');
      }

      setActiveAnalysis(data.data);
      // Refresh history list
      await fetchHistory();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Compare Job Description handler
  const handleJdMatch = async (e) => {
    e.preventDefault();
    if (!jdText.trim() || !activeAnalysis) return;

    setMatchingJd(true);
    setJdError('');
    setJdResult(null);

    try {
      const response = await fetch(`${API_URL}/resume/compare`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_description: jdText,
          resume_id: activeAnalysis.resume_id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Comparison failed');
      }

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
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSkillCategoryIcon = (category) => {
    switch (category) {
      case 'Programming Languages': return <Code size={16} />;
      case 'Frontend Development': return <Globe size={16} />;
      case 'Backend Development': return <Briefcase size={16} />;
      case 'Database & Storage': return <Database size={16} />;
      case 'Cloud & DevOps': return <Cloud size={16} />;
      case 'AI & Data Science': return <Brain size={16} />;
      default: return <Code size={16} />;
    }
  };

  return (
    <div>
      {/* Header bar */}
      <header className="navbar">
        <div className="nav-brand">
          <Sparkles size={22} style={{ color: 'var(--secondary)' }} />
          <span>AI Resume Analyzer</span>
        </div>
        <div className="nav-user">
          <span className="nav-username">Hello, <strong>{user?.name}</strong></span>
          <button 
            onClick={onToggleTheme} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.4rem',
              borderRadius: '50%',
              transition: 'var(--transition-smooth)',
              marginRight: '0.25rem'
            }}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="nav-logout" onClick={onLogout}>
            <LogOut size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="dashboard-grid">
          
          {/* Left Panel: Upload Zone & History */}
          <div className="sidebar-panel">
            {/* Upload Zone */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 className="history-title" style={{ marginTop: 0 }}>Analyze Resume</h3>
              <div 
                className="upload-zone" 
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{ pointerEvents: uploading ? 'none' : 'auto' }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                />
                <Upload className="upload-icon" />
                <p className="upload-text">
                  {uploading ? 'Analyzing Resume...' : 'Upload Resume File'}
                </p>
                <p className="upload-hint">Supports PDF, DOCX, DOC, TXT</p>
              </div>

              {uploadError && (
                <div style={{
                  color: '#f87171',
                  background: 'var(--error-glow)',
                  border: '1px solid var(--error)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  marginTop: '1rem',
                  textAlign: 'center'
                }}>
                  {uploadError}
                </div>
              )}
            </div>

            {/* History List */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 className="history-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={16} />
                Recent Analyses
              </h3>
              {history.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                  No resumes uploaded yet.
                </p>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div 
                      key={item.resume_id} 
                      className={`history-item ${activeAnalysis?.resume_id === item.resume_id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveAnalysis(item);
                        setJdResult(null);
                        setJdText('');
                      }}
                    >
                      <div className="history-item-header">
                        <span className="history-filename" title={item.filename}>
                          {item.filename}
                        </span>
                        <span 
                          className="history-score"
                          style={{
                            background: item.score >= 80 ? 'var(--success-glow)' : 'var(--border-light)',
                            color: item.score >= 80 ? 'var(--success)' : 'var(--text-secondary)'
                          }}
                        >
                          {item.score} pts
                        </span>
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

          {/* Right Panel: Active Analysis Results */}
          <div className="analysis-main">
            {activeAnalysis ? (
              <>
                {/* Score Rings and Breakdown */}
                <div className="glass-panel">
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                    Overall Evaluation: {activeAnalysis.filename}
                  </h2>
                  <div className="scores-section">
                    <RadialProgress 
                      value={activeAnalysis.score} 
                      title="Resume Score" 
                      subText="Core score evaluating skills, formatting, and achievements" 
                      color="var(--primary-light)"
                      glow="var(--primary-glow)"
                    />
                    
                    <RadialProgress 
                      value={activeAnalysis.ats_score} 
                      title="ATS Score" 
                      subText="Applicant Tracking System readability score" 
                      color="var(--secondary)"
                      glow="var(--secondary-glow)"
                    />
                  </div>

                  <div className="breakdown-bars">
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Score Breakdown</h4>
                    
                    <div className="breakdown-item">
                      <div className="breakdown-label">
                        <span>Technical Skills (Max 30)</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong>{activeAnalysis.score_breakdown?.skills || 0} / 30</strong>
                          <InfoTooltip 
                            text={getSkillsDeductionMessage(activeAnalysis.score_breakdown?.skills || 0)} 
                            score={activeAnalysis.score_breakdown?.skills || 0} 
                            max={30} 
                          />
                        </span>
                      </div>
                      <div className="breakdown-track">
                        <div 
                          className="breakdown-bar" 
                          style={{ 
                            width: `${((activeAnalysis.score_breakdown?.skills || 0) / 30) * 100}%`,
                            background: 'var(--primary-light)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-label">
                        <span>Projects (Max 25)</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong>{activeAnalysis.score_breakdown?.projects || 0} / 25</strong>
                          <InfoTooltip 
                            text={getProjectsDeductionMessage(activeAnalysis.score_breakdown?.projects || 0)} 
                            score={activeAnalysis.score_breakdown?.projects || 0} 
                            max={25} 
                          />
                        </span>
                      </div>
                      <div className="breakdown-track">
                        <div 
                          className="breakdown-bar" 
                          style={{ 
                            width: `${((activeAnalysis.score_breakdown?.projects || 0) / 25) * 100}%`,
                            background: 'var(--primary-light)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-label">
                        <span>Experience (Max 20)</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong>{activeAnalysis.score_breakdown?.experience || 0} / 20</strong>
                          <InfoTooltip 
                            text={getExperienceDeductionMessage(activeAnalysis.score_breakdown?.experience || 0)} 
                            score={activeAnalysis.score_breakdown?.experience || 0} 
                            max={20} 
                          />
                        </span>
                      </div>
                      <div className="breakdown-track">
                        <div 
                          className="breakdown-bar" 
                          style={{ 
                            width: `${((activeAnalysis.score_breakdown?.experience || 0) / 20) * 100}%`,
                            background: 'var(--primary-light)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-label">
                        <span>Education (Max 15)</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong>{activeAnalysis.score_breakdown?.education || 0} / 15</strong>
                          <InfoTooltip 
                            text={getEducationDeductionMessage(activeAnalysis.score_breakdown?.education || 0)} 
                            score={activeAnalysis.score_breakdown?.education || 0} 
                            max={15} 
                          />
                        </span>
                      </div>
                      <div className="breakdown-track">
                        <div 
                          className="breakdown-bar" 
                          style={{ 
                            width: `${((activeAnalysis.score_breakdown?.education || 0) / 15) * 100}%`,
                            background: 'var(--primary-light)'
                          }}
                        />
                      </div>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-label">
                        <span>Certifications (Max 10)</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong>{activeAnalysis.score_breakdown?.certifications || 0} / 10</strong>
                          <InfoTooltip 
                            text={getCertificationsDeductionMessage(activeAnalysis.score_breakdown?.certifications || 0)} 
                            score={activeAnalysis.score_breakdown?.certifications || 0} 
                            max={10} 
                          />
                        </span>
                      </div>
                      <div className="breakdown-track">
                        <div 
                          className="breakdown-bar" 
                          style={{ 
                            width: `${((activeAnalysis.score_breakdown?.certifications || 0) / 10) * 100}%`,
                            background: 'var(--primary-light)'
                          }}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Extracted Skills List */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Code style={{ color: 'var(--secondary)' }} />
                    Identified Technical Skills
                  </h3>
                  
                  {activeAnalysis.skills && activeAnalysis.skills.length === 0 ? (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No programming keywords matched standard technology list. Add technical keywords to your resume.
                    </p>
                  ) : (
                    <div className="skills-grid">
                      {Object.entries(activeAnalysis.skills_by_category || {}).map(([category, items]) => {
                        if (!items || items.length === 0) return null;
                        return (
                          <div key={category} className="skill-category-card">
                            <h4 className="skill-category-title">
                              {getSkillCategoryIcon(category)}
                              {category}
                            </h4>
                            <div className="skills-tags-container">
                              {items.map(skill => (
                                <span key={skill} className="skill-tag">{skill}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ATS Compliance Checklist */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp style={{ color: 'var(--primary-light)' }} />
                    ATS Compatibility Checks
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

                {/* Suggestions Section */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                    <AlertCircle />
                    Recommendations for Improvement
                  </h3>
                  <div className="suggestions-list">
                    {activeAnalysis.suggestions?.map((suggestion, idx) => (
                      <div key={idx} className="suggestion-item">
                        <span className="suggestion-bullet">✦</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Job Description Matching Widget */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Briefcase style={{ color: 'var(--secondary)' }} />
                    Job Description Matching Engine
                  </h3>
                  <form onSubmit={handleJdMatch} className="jd-panel">
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Paste a target job description below to analyze how well this resume matches the role requirements, identify missing keyword gaps, and check similarity.
                    </p>
                    <textarea
                      placeholder="e.g. Seeking a React Developer experienced with TypeScript, Node.js, and MongoDB. Must have good understanding of REST APIs and Docker..."
                      className="jd-textarea"
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      required
                    />
                    <div>
                      <button 
                        type="submit" 
                        className={`btn btn-secondary ${matchingJd ? 'btn-disabled' : ''}`}
                        disabled={matchingJd}
                        style={{ width: 'auto' }}
                      >
                        {matchingJd ? 'Analyzing Match...' : 'Calculate JD Match Score'}
                      </button>
                    </div>
                  </form>

                  {jdError && (
                    <div style={{ color: '#f87171', background: 'var(--error-glow)', border: '1px solid var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem', fontSize: '0.85rem' }}>
                      {jdError}
                    </div>
                  )}

                  {jdResult && (
                    <div className="jd-results-grid">
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: '800', color: jdResult.match_percentage >= 75 ? 'var(--success)' : 'var(--warning)' }}>
                          {jdResult.match_percentage}%
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Match Rating</span>
                      </div>
                      
                      <div className="jd-skills-summary">
                        <div>
                          <h5 className="jd-matching-skills-title">Matching Credentials ({jdResult.matching_skills?.length || 0})</h5>
                          {jdResult.matching_skills && jdResult.matching_skills.length === 0 ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None matched.</span>
                          ) : (
                            <div className="skills-tags-container" style={{ marginTop: '0.25rem' }}>
                              {jdResult.matching_skills?.map(skill => (
                                <span key={skill} className="skill-tag skill-tag-matching">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ marginTop: '0.5rem' }}>
                          <h5 className="jd-missing-skills-title">Identified Missing Skills ({jdResult.missing_skills?.length || 0})</h5>
                          {jdResult.missing_skills && jdResult.missing_skills.length === 0 ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Perfect skill coverage! None missing.</span>
                          ) : (
                            <div className="skills-tags-container" style={{ marginTop: '0.25rem' }}>
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
              /* Empty state when no analysis active */
              <div className="glass-panel empty-state">
                <FileText className="empty-state-icon" />
                <h2>No Resume Analyzed Yet</h2>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                  Upload a resume file on the left panel to trigger detailed score evaluation, ATS compliance checking, and job matching.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
