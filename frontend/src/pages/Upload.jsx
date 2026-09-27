import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FaCloudUploadAlt, FaExclamationTriangle, FaCheckCircle,
  FaSync, FaFileAlt, FaTimes, FaFilter, FaDownload
} from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';

const getRiskClass = (score) => score > 75 ? 'high' : score > 30 ? 'mid' : 'low';

const StatusBadge = ({ status }) => {
  if (status === 'Normal')
    return <span className="status-badge normal"><FaCheckCircle /> Normal</span>;
  if (status && status.includes('Zero-Day'))
    return <span className="status-badge zeroday"><FaExclamationTriangle /> Zero-Day</span>;
  return <span className="status-badge attack"><MdSecurity /> Known Attack</span>;
};

const Upload = () => {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('index');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const fileInputRef = useRef();
  const rowsPerPage = 15;

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setResults(null);
      setError(null);
    } else {
      setError('Only CSV files are accepted.');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    handleFileSelect(dropped);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleUpload = async () => {
    if (!file) { setError('Please select a file first.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setError(null);
    setResults(null);
    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data);
      setPage(1);
      setFilterStatus('All');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during prediction.');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => { setFile(null); setResults(null); setError(null); };

  // Filtering + sorting
  const filteredResults = results?.results
    ? results.results
        .filter(r => filterStatus === 'All' || r.status.includes(filterStatus))
        .sort((a, b) => {
          if (sortBy === 'risk') return b.risk_score - a.risk_score;
          if (sortBy === 'confidence') return b.confidence - a.confidence;
          return 0;
        })
    : [];

  const totalPages = Math.ceil(filteredResults.length / rowsPerPage);
  const pageData = filteredResults.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Summary stats from results
  const summary = results ? {
    normal:  results.results.filter(r => r.status === 'Normal').length,
    attacks: results.results.filter(r => r.status !== 'Normal' && !r.status.includes('Zero-Day')).length,
    zeroday: results.results.filter(r => r.status.includes('Zero-Day')).length,
    highRisk: results.results.filter(r => r.risk_score > 75).length,
  } : null;

  // Download results CSV
  const downloadResults = () => {
    if (!results) return;
    const headers = ['#', 'Status', 'Attack Type', 'Confidence (%)', 'Risk Score', 'Anomaly Score'];
    const rows = results.results.map((r, i) => [
      i + 1, r.status, r.attack_type,
      (r.confidence * 100).toFixed(1),
      r.risk_score,
      r.anomaly_score?.toFixed(4) ?? 'N/A'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `predictions_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Prediction Center</h1>
          <div className="page-subtitle">Upload network traffic CSV · AI-powered zero-day detection</div>
        </div>
        {results && (
          <button className="btn-cyber btn-success-cyber" onClick={downloadResults}>
            <FaDownload /> Export Results
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left Panel: Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Drop Zone */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !file && fileInputRef.current.click()}
              style={{ cursor: file ? 'default' : 'pointer' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={e => handleFileSelect(e.target.files[0])}
              />

              {!file ? (
                <>
                  <div className="drop-icon"><FaCloudUploadAlt /></div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Drop CSV file here
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    or click to browse
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    .csv format only
                  </div>
                </>
              ) : (
                <div onClick={e => e.stopPropagation()}>
                  <FaFileAlt style={{ fontSize: '2.5rem', color: 'var(--neon-blue)', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 8px var(--neon-blue))' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', wordBreak: 'break-all' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    className="btn-cyber btn-ghost-cyber"
                    onClick={clearFile}
                    style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                  >
                    <FaTimes /> Remove
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="cyber-alert danger" style={{ marginTop: '1rem' }}>
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              className="btn-cyber btn-primary-cyber"
              style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', fontSize: '0.95rem' }}
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <><FaSync style={{ animation: 'spin 0.8s linear infinite' }} /> Analyzing...</>
              ) : (
                <><MdSecurity /> Run Detection Pipeline</>
              )}
            </button>

            {/* Upload progress indicator */}
            {uploading && (
              <div>
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: '100%' }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                  Running Isolation Forest + XGBoost...
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Info */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Detection Pipeline
            </div>
            {[
              { step: '01', name: 'Preprocessing',      desc: 'Normalize & clean features', color: '#3b82f6' },
              { step: '02', name: 'Isolation Forest',   desc: 'Anomaly detection', color: '#8b5cf6' },
              { step: '03', name: 'XGBoost Classifier', desc: 'Attack classification', color: '#06b6d4' },
              { step: '04', name: 'Risk Scoring',       desc: 'Threat level assessment', color: '#f59e0b' },
            ].map(p => (
              <div key={p.step} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '0.6rem 0.75rem', marginBottom: '6px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${p.color}18`, border: `1px solid ${p.color}40`,
                  fontSize: '0.6rem', fontWeight: 700, color: p.color,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {p.step}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Results */}
        <div>
          {!results && !uploading && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="empty-state">
                <MdSecurity className="empty-icon" style={{ color: 'var(--neon-blue)' }} />
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>Awaiting Upload</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>
                  Upload a network traffic CSV file to run it through the AI detection pipeline.
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="glass-card scanner-overlay" style={{ padding: '1.5rem' }}>
              <div className="scanner-line" />
              <div className="loading-center" style={{ minHeight: '300px' }}>
                <div className="cyber-spinner" />
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Scanning Traffic...</div>
                <div className="loading-text">Running Isolation Forest & XGBoost models</div>
              </div>
            </div>
          )}

          {results && (
            <div className="fade-in">
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Total', val: results.total_records, col: '#3b82f6' },
                  { label: 'Normal', val: summary.normal, col: '#10b981' },
                  { label: 'Attacks', val: summary.attacks, col: '#f59e0b' },
                  { label: 'Zero-Day', val: summary.zeroday, col: '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.col, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Success Bar */}
              <div className="cyber-alert success" style={{ marginBottom: '1rem' }}>
                <FaCheckCircle />
                Successfully analyzed <strong>{results.total_records}</strong> packets ·{' '}
                <strong>{summary.highRisk}</strong> high-risk events detected
              </div>

              {/* Filter / Sort Bar */}
              <div style={{
                display: 'flex', gap: '0.75rem', marginBottom: '0.75rem',
                alignItems: 'center', flexWrap: 'wrap',
              }}>
                <FaFilter style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
                <select
                  className="cyber-select"
                  style={{ width: 'auto', minWidth: '140px' }}
                  value={filterStatus}
                  onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                >
                  <option value="All">All Results</option>
                  <option value="Normal">Normal Only</option>
                  <option value="Zero-Day">Zero-Day Only</option>
                </select>
                <select
                  className="cyber-select"
                  style={{ width: 'auto', minWidth: '160px' }}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="index">Sort: Row Index</option>
                  <option value="risk">Sort: Risk Score ↓</option>
                  <option value="confidence">Sort: Confidence ↓</option>
                </select>
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {filteredResults.length} records
                </span>
              </div>

              {/* Table */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto' }}>
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Status</th>
                        <th>Attack Type</th>
                        <th>Confidence</th>
                        <th>Risk Score</th>
                        <th>Anomaly Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((res, idx) => {
                        const absIdx = (page - 1) * rowsPerPage + idx;
                        const rc = getRiskClass(res.risk_score);
                        const isExpanded = expandedRow === absIdx;
                        const hasShap = res.shap_values && res.shap_values.length > 0;
                        
                        return (
                          <React.Fragment key={absIdx}>
                            <tr style={{ animationDelay: `${idx * 0.03}s`, cursor: hasShap ? 'pointer' : 'default' }} onClick={() => hasShap && setExpandedRow(isExpanded ? null : absIdx)}>
                              <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                {absIdx + 1}
                              </td>
                              <td><StatusBadge status={res.status} /></td>
                              <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                {res.attack_type || '—'}
                              </td>
                              <td>
                                <span className="mono" style={{
                                  fontSize: '0.85rem', fontWeight: 600,
                                  color: res.confidence > 0.8 ? '#10b981' : res.confidence > 0.5 ? '#f59e0b' : '#94a3b8',
                                }}>
                                  {(res.confidence * 100).toFixed(1)}%
                                </span>
                              </td>
                              <td>
                                <div className="risk-bar-wrapper">
                                  <div className="risk-bar-track">
                                    <div
                                      className={`risk-bar-fill ${rc}`}
                                      style={{ width: `${res.risk_score}%` }}
                                    />
                                  </div>
                                  <span className={`risk-value ${rc}`}>{res.risk_score}</span>
                                </div>
                              </td>
                              <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {res.anomaly_score !== undefined ? res.anomaly_score.toFixed(4) : '—'}
                                {hasShap && <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--primary-accent)' }}>{isExpanded ? '▲ Hide SHAP' : '▼ View SHAP'}</span>}
                              </td>
                            </tr>
                            
                            {/* SHAP Expandable Row */}
                            {isExpanded && hasShap && (
                              <tr className="shap-row">
                                <td colSpan="6" style={{ padding: 0 }}>
                                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>AI Explainability (SHAP Values) - Top Contributors</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                      {res.shap_values.map((shap, sIdx) => (
                                        <div key={sIdx} style={{ 
                                          background: 'var(--glass-bg)', padding: '10px', borderRadius: '6px', 
                                          borderLeft: `3px solid ${shap.direction === 'POSITIVE' ? 'var(--danger)' : 'var(--success)'}` 
                                        }}>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shap.feature}</div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Val: {shap.value.toFixed(2)}</span>
                                            <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: shap.direction === 'POSITIVE' ? 'var(--danger)' : 'var(--success)' }}>
                                              {shap.direction === 'POSITIVE' ? '+' : ''}{shap.contribution.toFixed(4)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    gap: '6px', padding: '1rem',
                    borderTop: '1px solid var(--glass-border)',
                  }}>
                    <button className="pagination-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                    <button className="pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      return p <= totalPages ? (
                        <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                          {p}
                        </button>
                      ) : null;
                    })}
                    <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                    <button className="pagination-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
