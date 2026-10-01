import React, { useState, useEffect, useCallback } from 'react';
import axios, { API_BASE_URL } from '../api';
import {
  FaDownload, FaSearch, FaSync, FaFilter,
  FaCheckCircle, FaExclamationTriangle, FaHistory
} from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';

const getRiskClass = (score) => score > 75 ? 'high' : score > 30 ? 'mid' : 'low';

const StatusBadge = ({ status }) => {
  if (status === 'Normal')
    return <span className="status-badge normal"><FaCheckCircle /> Normal</span>;
  if (status && status.includes('Zero-Day'))
    return <span className="status-badge zeroday"><FaExclamationTriangle /> Zero-Day</span>;
  return <span className="status-badge attack"><MdSecurity /> Attack</span>;
};

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${"$"}{API_BASE_URL}/api/history`, { withCredentials: true });
      const records = response.data.history || [];
      const mapped = records.map(row => {
        let status = 'Normal';
        if (row.prediction && row.prediction !== 'NORMAL') {
          status = row.attack_type === 'Zero-Day/Unknown Anomaly' ? 'Zero-Day' : 'Known Attack';
        }
        return {
          ...row,
          status,
          filename: row.source || '—'
        };
      });
      setHistory(mapped);
    } catch (error) {
      console.error('Error fetching history', error);
      setError('Unable to load prediction history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  // Filter & sort
  const processed = history
    .filter(row => {
      const matchSearch =
        (row.filename || '').toLowerCase().includes(search.toLowerCase()) ||
        (row.attack_type || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Normal' && row.status === 'Normal') ||
        (filterStatus === 'Zero-Day' && row.status?.includes('Zero-Day')) ||
        (filterStatus === 'Attack' && row.status !== 'Normal' && !row.status?.includes('Zero-Day'));
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let valA = a[sortField], valB = b[sortField];
      if (sortField === 'timestamp') { valA = new Date(valA); valB = new Date(valB); }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(processed.length / rowsPerPage);
  const pageData = processed.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Summary
  const summary = {
    total:   history.length,
    normal:  history.filter(r => r.status === 'Normal').length,
    attacks: history.filter(r => r.status !== 'Normal' && !r.status?.includes('Zero-Day')).length,
    zeroday: history.filter(r => r.status?.includes('Zero-Day')).length,
  };

  // Download CSV
  const downloadCSV = () => {
    const headers = ['ID', 'Timestamp', 'Filename', 'Status', 'Attack Type', 'Confidence', 'Risk Score'];
    const rows = processed.map(r => [
      r.id,
      `"${r.timestamp}"`,
      `"${r.filename}"`,
      `"${r.status}"`,
      `"${r.attack_type}"`,
      r.confidence,
      r.risk_score,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_log_${Date.now()}.csv`;
    a.click();
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span style={{ color: 'var(--neon-blue)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="loading-center">
        <div className="cyber-spinner" />
        <div className="loading-text">LOADING AUDIT LOGS...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <FaExclamationTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h2>Something went wrong</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="btn-cyber btn-primary-cyber" onClick={fetchHistory} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <div className="page-subtitle">
            Complete prediction history · {history.length} total records
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-cyber btn-ghost-cyber" onClick={fetchHistory} style={{ fontSize: '0.85rem' }}>
            <FaSync /> Refresh
          </button>
          <button
            className="btn-cyber btn-primary-cyber"
            onClick={downloadCSV}
            disabled={processed.length === 0}
            style={{ fontSize: '0.85rem' }}
          >
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Events', val: summary.total,   col: '#3b82f6', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.2)' },
          { label: 'Normal',       val: summary.normal,  col: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Known Attacks',val: summary.attacks, col: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
          { label: 'Zero-Day',     val: summary.zeroday, col: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
        ].map((s, i) => (
          <div key={s.label} className={`fade-in-up delay-${i + 1}`} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
          }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: s.col, fontWeight: 600, marginBottom: '6px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-bright)', fontFamily: "'JetBrains Mono', monospace" }}>
              {s.val.toLocaleString()}
            </div>
            {summary.total > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                {((s.val / summary.total) * 100).toFixed(1)}% of total
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filter/Search Bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1rem',
        padding: '1rem 1.25rem',
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <FaSearch style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          className="cyber-input"
          style={{ maxWidth: '260px' }}
          placeholder="Search by filename or attack type..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <FaFilter style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', flexShrink: 0 }} />
        <select
          className="cyber-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="All">All Status</option>
          <option value="Normal">Normal</option>
          <option value="Zero-Day">Zero-Day</option>
          <option value="Attack">Known Attack</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            {processed.length} result{processed.length !== 1 ? 's' : ''}
          </span>
          {search || filterStatus !== 'All' ? (
            <button
              className="btn-cyber btn-ghost-cyber"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => { setSearch(''); setFilterStatus('All'); setPage(1); }}
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {processed.length === 0 ? (
          <div className="empty-state">
            <FaHistory className="empty-icon" style={{ color: 'var(--neon-blue)' }} />
            <div style={{ fontWeight: 600 }}>No records found</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {history.length === 0 ? 'Upload a file to generate prediction logs.' : 'Try adjusting your filters.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Timestamp <SortIcon field="timestamp" />
                    </th>
                    <th>Filename</th>
                    <th>Status</th>
                    <th onClick={() => handleSort('attack_type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Attack Type <SortIcon field="attack_type" />
                    </th>
                    <th onClick={() => handleSort('confidence')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Confidence <SortIcon field="confidence" />
                    </th>
                    <th onClick={() => handleSort('risk_score')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Risk Score <SortIcon field="risk_score" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row, idx) => {
                    const rc = getRiskClass(row.risk_score);
                    return (
                      <tr key={row.id} style={{ animationDelay: `${idx * 0.025}s` }}>
                        <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(row.timestamp).toLocaleString()}
                        </td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.83rem' }}>
                          {row.filename || '—'}
                        </td>
                        <td><StatusBadge status={row.status} /></td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {row.attack_type || '—'}
                        </td>
                        <td>
                          <span className="mono" style={{
                            fontWeight: 700,
                            color: row.confidence > 0.8 ? '#10b981' : row.confidence > 0.5 ? '#f59e0b' : '#94a3b8',
                          }}>
                            {row.confidence !== null && row.confidence !== undefined
                              ? `${(row.confidence * 100).toFixed(1)}%`
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="risk-bar-wrapper">
                            <div className="risk-bar-track">
                              <div className={`risk-bar-fill ${rc}`} style={{ width: `${row.risk_score}%` }} />
                            </div>
                            <span className={`risk-value ${rc}`}>{row.risk_score}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--glass-border)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  Page {page} of {totalPages} · {processed.length} records
                </span>
                <div style={{ display: 'flex', gap: '5px' }}>
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;
