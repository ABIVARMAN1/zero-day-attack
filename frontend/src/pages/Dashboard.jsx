import React, { useState, useEffect, useCallback } from 'react';
import axios, { API_BASE_URL } from '../api';
import Plot from 'react-plotly.js';
import {
  FaShieldAlt, FaExclamationTriangle, FaBug,
  FaCheckCircle, FaFire, FaSync, FaNetworkWired,
  FaBolt, FaChartBar
} from 'react-icons/fa';
import { MdOutlineSpeed } from 'react-icons/md';

const ThreatBadge = ({ level }) => {
  const map = {
    CRITICAL: { cls: 'critical', label: 'CRITICAL', icon: '🔴' },
    HIGH:     { cls: 'high',     label: 'HIGH',     icon: '🟠' },
    MEDIUM:   { cls: 'medium',   label: 'MEDIUM',   icon: '🟡' },
    LOW:      { cls: 'low',      label: 'LOW',      icon: '🟢' },
  };
  const t = map[level] || map.LOW;
  return (
    <div className={`threat-badge ${t.cls}`}>
      <div className="threat-dot" />
      THREAT · {t.label}
    </div>
  );
};

const StatCard = ({ icon, label, value, color, delay, unit = '' }) => (
  <div className={`stat-card ${color} fade-in-up delay-${delay}`}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div className={`stat-icon-ring ${color}`}>{icon}</div>
      <div className="live-indicator">
        <div className="live-dot" />
        LIVE
      </div>
    </div>
    <div className={`stat-value text-neon-${color === 'blue' ? 'blue' : color === 'green' ? 'green' : color === 'red' ? 'red' : color === 'orange' ? 'orange' : 'purple'}`}>
      {typeof value === 'number' ? value.toLocaleString() : value}
      {unit && <span style={{ fontSize: '1rem', marginLeft: '4px', opacity: 0.7 }}>{unit}</span>}
    </div>
    <div className="stat-label">{label}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await axios.get(`${"$"}{API_BASE_URL}/dashboard`);
      setStats(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="cyber-spinner" />
        <div className="loading-text">INITIALIZING SECURITY DASHBOARD...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="loading-center">
        <FaExclamationTriangle style={{ fontSize: '3rem', color: 'var(--neon-red)', opacity: 0.5 }} />
        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Connection Failed</div>
          <div style={{ fontSize: '0.85rem' }}>Unable to connect to the backend service.<br/>Backend: {API_BASE_URL}</div>
        </div>
      </div>
    );
  }

  const totalSafe = stats.total_packets > 0
    ? Math.round((stats.normal_traffic / stats.total_packets) * 100)
    : 100;

  const attackColors = [
    '#ef4444', '#f59e0b', '#3b82f6', '#10b981',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'
  ];

  const pieData = [{
    values: Object.values(stats.attack_distribution),
    labels: Object.keys(stats.attack_distribution),
    type: 'pie',
    hole: 0.55,
    marker: { colors: attackColors, line: { color: 'var(--surface-secondary)', width: 2 } },
    textinfo: 'label+percent',
    textfont: { color: 'var(--chart-text)', size: 11, family: 'Inter' },
    hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Share: %{percent}<extra></extra>',
  }];

  const pieLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font: { color: 'var(--chart-text)', family: 'Inter' },
    showlegend: true,
    legend: {
      orientation: 'v',
      x: 1.05, y: 0.5,
      font: { size: 11 },
      bgcolor: 'rgba(0,0,0,0)',
    },
    margin: { t: 10, b: 10, l: 10, r: 130 },
    height: 280,
    annotations: [{
      text: `<b>${stats.detected_attacks + stats.zero_day_attacks}</b><br><span style="font-size:10px">Threats</span>`,
      x: 0.5, y: 0.5,
      font: { size: 16, color: 'var(--text-primary)', family: 'Inter' },
      showarrow: false,
    }],
  };

  const statsCards = [
    {
      icon: <FaNetworkWired />, label: 'Total Packets',
      value: stats.total_packets, color: 'blue', delay: 1
    },
    {
      icon: <FaCheckCircle />, label: 'Normal Traffic',
      value: stats.normal_traffic, color: 'green', delay: 2
    },
    {
      icon: <FaBug />, label: 'Known Attacks',
      value: stats.detected_attacks, color: 'orange', delay: 3
    },
    {
      icon: <FaFire />, label: 'Zero-Day Anomalies',
      value: stats.zero_day_attacks, color: 'red', delay: 4
    },
    {
      icon: <FaExclamationTriangle />, label: 'High Risk Alerts',
      value: stats.high_risk_alerts, color: 'purple', delay: 5
    },
  ];

  /* Gauge SVG */
  const gaugeAngle = (totalSafe / 100) * 180 - 90; // -90 to 90 degrees
  const gaugeRadius = 70;
  const cx = 90, cy = 90;
  const polarToCartesian = (angle, r) => ({
    x: cx + r * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + r * Math.sin((angle - 90) * Math.PI / 180),
  });
  const start = polarToCartesian(-90, gaugeRadius);
  const end   = polarToCartesian(gaugeAngle, gaugeRadius);
  const largeArc = totalSafe > 50 ? 1 : 0;
  const gaugeColor = totalSafe > 70 ? '#10b981' : totalSafe > 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Dashboard</h1>
          <div className="page-subtitle">
            {lastUpdated
              ? `Last updated · ${lastUpdated.toLocaleTimeString()}`
              : 'Connecting...'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThreatBadge level={stats.threat_level} />
          <button
            className="btn-cyber btn-ghost-cyber"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <FaSync style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {statsCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Attack Distribution */}
        <div className="chart-panel attack-dist-card fade-in-up delay-2">
          <div className="chart-title">
            <div className="chart-title-dot" style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
            Attack Distribution
          </div>
          {Object.keys(stats.attack_distribution).length > 0 ? (
            <Plot
              data={pieData}
              layout={pieLayout}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <FaShieldAlt className="empty-icon" style={{ color: '#10b981' }} />
              <span>No attack data — system is clean</span>
            </div>
          )}
        </div>

        {/* Health Gauge + Summary */}
        <div className="chart-panel system-health-card fade-in-up delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-title">
            <div className="chart-title-dot" style={{ background: gaugeColor, boxShadow: `0 0 6px ${gaugeColor}` }} />
            System Health Score
          </div>

          {/* SVG Gauge */}
          <div className="system-health-gauge" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <svg width="180" height="100" viewBox="0 0 180 100">
              {/* Track */}
              <path
                d={`M ${polarToCartesian(-90, gaugeRadius).x} ${polarToCartesian(-90, gaugeRadius).y} A ${gaugeRadius} ${gaugeRadius} 0 1 1 ${polarToCartesian(90, gaugeRadius).x} ${polarToCartesian(90, gaugeRadius).y}`}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"
              />
              {/* Fill */}
              {totalSafe > 0 && (
                <path
                  d={`M ${start.x} ${start.y} A ${gaugeRadius} ${gaugeRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
                  fill="none" stroke={gaugeColor} strokeWidth="10" strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 6px ${gaugeColor})` }}
                />
              )}
              {/* Center text */}
              <text x="90" y="78" textAnchor="middle" fill="#f0f4ff" fontSize="24" fontWeight="800" fontFamily="Inter">
                {totalSafe}%
              </text>
              <text x="90" y="94" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="Inter" letterSpacing="1">
                SECURE
              </text>
            </svg>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {[
              { label: 'Detection Rate', value: stats.total_packets > 0 ? `${((stats.detected_attacks + stats.zero_day_attacks) / stats.total_packets * 100).toFixed(1)}%` : '0%', color: '#ef4444', cls: 'metric-box-detection' },
              { label: 'Zero-Day Rate', value: stats.total_packets > 0 ? `${(stats.zero_day_attacks / stats.total_packets * 100).toFixed(2)}%` : '0%', color: '#f59e0b', cls: 'metric-box-zeroday' },
              { label: 'Normal Traffic', value: stats.total_packets > 0 ? `${(stats.normal_traffic / stats.total_packets * 100).toFixed(1)}%` : '0%', color: '#10b981', cls: 'metric-box-normal' },
            ].map(item => (
              <div key={item.label} className={item.cls} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.9rem', color: item.color, textShadow: `0 0 10px ${item.color}` }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="chart-panel fade-in-up delay-4">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <FaChartBar style={{ color: 'var(--neon-blue)', marginRight: '4px' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '1rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Quick Summary</span>
          {[
            { label: 'Total Scanned', val: stats.total_packets, col: 'var(--neon-blue)' },
            { label: 'Threats Found', val: stats.detected_attacks + stats.zero_day_attacks, col: '#ef4444' },
            { label: 'High Risk', val: stats.high_risk_alerts, col: '#f59e0b' },
            { label: 'Attack Types', val: Object.keys(stats.attack_distribution).length, col: '#8b5cf6' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '0.4rem 1rem', borderRadius: '20px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}:</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: item.col, fontSize: '0.9rem' }}>
                {item.val.toLocaleString()}
              </span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <div className="live-indicator">
              <div className="live-dot" />
              AUTO-REFRESH · 6s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

