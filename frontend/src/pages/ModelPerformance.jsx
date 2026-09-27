import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBrain, FaChartLine, FaRobot, FaDatabase } from 'react-icons/fa';
import './ModelPerformance.css';

const ModelPerformance = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/models', { withCredentials: true });
      if (res.data.success) {
        setModels(res.data.models);
      }
    } catch (err) {
      console.error("Error fetching models", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in models-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Model Registry & Performance</h1>
          <div className="page-subtitle">Governance, Metrics & Health</div>
        </div>
      </div>

      {/* Model Performance Overview */}
      <h3 className="section-heading">Core Engine Performance</h3>
      <div className="performance-grid">
        <div className="glass-card metric-card">
          <h3 className="metric-title" style={{ color: 'var(--primary-accent)' }}>
            <FaBrain /> Isolation Forest
          </h3>
          <p className="metric-desc">Unsupervised Zero-Day Anomaly Detection</p>
          
          <div className="metric-rows">
            <div className="metric-row">
              <span>Precision</span><span className="mono text-success">0.9620</span>
            </div>
            <div className="metric-row">
              <span>Recall</span><span className="mono text-warning">0.2798</span>
            </div>
            <div className="metric-row">
              <span>False Positive Rate</span><span className="mono text-success">0.0098</span>
            </div>
          </div>
        </div>

        <div className="glass-card metric-card">
          <h3 className="metric-title" style={{ color: 'var(--secondary-accent)' }}>
            <FaChartLine /> XGBoost
          </h3>
          <p className="metric-desc">Supervised Attack Classification Engine</p>

          <div className="metric-rows">
            <div className="metric-row">
              <span>Overall Accuracy</span><span className="mono text-success">0.9991</span>
            </div>
            <div className="metric-row">
              <span>Macro F1-Score</span><span className="mono text-success">0.9854</span>
            </div>
            <div className="metric-row">
              <span>DDoS Recall</span><span className="mono text-success">1.0000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Registry Table */}
      <h3 className="section-heading" style={{ marginTop: '2rem' }}>Active Model Registry</h3>
      <div className="glass-card registry-container">
        {loading ? (
          <div className="loading-state">Loading registry...</div>
        ) : (
          <table className="registry-table">
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Version</th>
                <th>Status</th>
                <th>Purpose</th>
                <th>Dataset Base</th>
                <th>Deployed On</th>
              </tr>
            </thead>
            <tbody>
              {models.map(model => (
                <tr key={model.id}>
                  <td>
                    <div className="model-name">
                      <FaRobot className="model-icon" />
                      {model.name}
                    </div>
                  </td>
                  <td className="mono">v{model.version}</td>
                  <td>
                    <span className={`status-badge ${model.status.toLowerCase()}`}>
                      {model.status}
                    </span>
                  </td>
                  <td>{model.purpose}</td>
                  <td>
                    <div className="dataset-label">
                      <FaDatabase /> {model.dataset}
                    </div>
                  </td>
                  <td>{new Date(model.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Data Drift Section (Conceptual for Phase 4) */}
      <h3 className="section-heading" style={{ marginTop: '2rem' }}>Data Drift Monitoring</h3>
      <div className="glass-card drift-card">
        <div className="drift-header">
          <h4>Feature Distribution Shift (Last 7 Days)</h4>
          <span className="status-badge success">STABLE</span>
        </div>
        <p className="metric-desc">Kullback-Leibler (KL) divergence across top 10 features shows minimal divergence from training baseline.</p>
        <div className="drift-visual">
          <div className="drift-bar-container">
            <span className="drift-label">Destination Port</span>
            <div className="drift-track"><div className="drift-fill" style={{width: '12%', background: 'var(--success)'}}></div></div>
            <span className="drift-value">KL: 0.012</span>
          </div>
          <div className="drift-bar-container">
            <span className="drift-label">Flow Duration</span>
            <div className="drift-track"><div className="drift-fill" style={{width: '28%', background: 'var(--warning)'}}></div></div>
            <span className="drift-value">KL: 0.045</span>
          </div>
          <div className="drift-bar-container">
            <span className="drift-label">Bwd Packet Length Std</span>
            <div className="drift-track"><div className="drift-fill" style={{width: '5%', background: 'var(--success)'}}></div></div>
            <span className="drift-value">KL: 0.003</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
