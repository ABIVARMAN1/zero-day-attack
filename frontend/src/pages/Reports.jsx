import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileAlt, FaDownload, FaSync } from 'react-icons/fa';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('Executive Summary (Weekly)');
  const [timeframe, setTimeframe] = useState('Last 7 Days');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/reports', { withCredentials: true });
      if (res.data.success) {
        setReports(res.data.reports);
      }
    } catch (err) {
      console.error("Error fetching reports", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (generating) return;
    
    // Dismiss any open dropdowns natively
    document.body.click();

    try {
      setGenerating(true);
      const res = await axios.post('http://localhost:5000/api/reports', {
        report_type: reportType,
        timeframe: timeframe
      }, { withCredentials: true });
      
      if (res.data.success) {
        setToast({ show: true, message: '✓ Report generated successfully', type: 'success' });
        fetchReports();
      }
    } catch (err) {
      console.error("Error generating report", err);
      setToast({ show: true, message: '✕ Report generation failed', type: 'error' });
    } finally {
      setGenerating(false);
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }
  };

  const handleDownload = async (reportId, title) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/reports/${reportId}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading report", err);
      setToast({ show: true, message: '✕ Download failed', type: 'error' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }
  };

  return (
    <div className="fade-in reports-container">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance & Reporting</h1>
          <div className="page-subtitle">Generate and audit security reports</div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchReports}><FaSync /> Refresh</button>
          <button className="btn-primary" onClick={handleGenerate}>+ Generate Report</button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="glass-card new-report-card">
          <h3>Create Custom Report</h3>
          <p className="text-muted">Generate a new report for compliance or executive review.</p>
          <div className="form-group">
            <label>Report Type</label>
            <select className="cyber-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option>Executive Summary (Weekly)</option>
              <option>Compliance Audit (SOC 2)</option>
              <option>Zero-Day Threat Analysis</option>
              <option>System Health & Drift</option>
            </select>
          </div>
          <div className="form-group">
            <label>Timeframe</label>
            <select className="cyber-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Year to Date</option>
            </select>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={generating}
            style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            {generating ? (
              <>Generating Report...</>
            ) : (
              <>Generate PDF</>
            )}
          </button>
        </div>

        <div className="glass-card">
          <h3>Recent Reports</h3>
          {loading ? (
            <div className="loading-state">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="empty-state">No reports generated recently.</div>
          ) : (
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Type</th>
                  <th>Generated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaFileAlt style={{ color: 'var(--primary-accent)' }} />
                        {report.title}
                      </div>
                    </td>
                    <td>{report.report_type}</td>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-ghost" title="Download" onClick={() => handleDownload(report.id, report.title)}>
                        <FaDownload />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
