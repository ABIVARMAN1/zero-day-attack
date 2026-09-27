import React, { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaStop, FaServer, FaShieldAlt } from 'react-icons/fa';

const LiveMonitoring = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        const types = ['Normal', 'DDoS', 'PortScan', 'Zero-Day'];
        const type = types[Math.floor(Math.random() * types.length)];
        const isNormal = type === 'Normal';
        
        const event = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          source: `192.168.1.${Math.floor(Math.random() * 255)}`,
          dest: `10.0.0.${Math.floor(Math.random() * 255)}`,
          protocol: ['TCP', 'UDP', 'HTTP'][Math.floor(Math.random() * 3)],
          status: isNormal ? 'Normal' : 'Anomaly',
          attack: type,
          risk: isNormal ? Math.floor(Math.random() * 20) : 70 + Math.floor(Math.random() * 30),
        };
        
        setEvents(prev => [event, ...prev].slice(0, 50));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Threat Monitor</h1>
          <div className="page-subtitle">Dataset-based Real-Time Simulation</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn-cyber ${isRunning ? 'btn-danger-cyber' : 'btn-success-cyber'}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <><FaPause /> Pause</> : <><FaPlay /> Start Simulation</>}
          </button>
          <button className="btn-cyber btn-ghost-cyber" onClick={() => { setIsRunning(false); setEvents([]); }}>
            <FaStop /> Clear
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', minHeight: '500px' }}>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Source IP</th>
              <th>Destination IP</th>
              <th>Protocol</th>
              <th>Status</th>
              <th>Attack Type</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                  <FaServer style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <div>No live events. Start simulation.</div>
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} style={{ background: ev.risk > 70 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                  <td className="mono">{ev.time}</td>
                  <td className="mono">{ev.source}</td>
                  <td className="mono">{ev.dest}</td>
                  <td>{ev.protocol}</td>
                  <td>
                    {ev.status === 'Normal' ? (
                      <span className="status-badge normal">Normal</span>
                    ) : (
                      <span className="status-badge attack">Suspicious</span>
                    )}
                  </td>
                  <td style={{ color: ev.risk > 70 ? 'var(--neon-red)' : 'inherit', fontWeight: 'bold' }}>{ev.attack}</td>
                  <td>
                    <span className="mono" style={{ color: ev.risk > 70 ? 'var(--neon-red)' : 'var(--neon-green)' }}>
                      {ev.risk}/100
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveMonitoring;

