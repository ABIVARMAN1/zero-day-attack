import React, { useState, useEffect } from 'react';
import axios, { API_BASE_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import './Alerts.css';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${"$"}{API_BASE_URL}/api/alerts`, { withCredentials: true });
            if (res.data.success) {
                setAlerts(res.data.alerts);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Failed to load alerts");
        } finally {
            setLoading(false);
        }
    };

    const updateAlertStatus = async (id, status) => {
        try {
            const res = await axios.patch(`${API_BASE_URL}/api/alerts/${id}`, { status }, { withCredentials: true });
            if (res.data.success) {
                fetchAlerts();
            }
        } catch (err) {
            alert("Error updating alert status");
        }
    };

    const handleInvestigate = async (alert) => {
        // Create an investigation and navigate to it
        try {
            const res = await axios.post(`${"$"}{API_BASE_URL}/api/investigations`, { alert_id: alert.id }, { withCredentials: true });
            if (res.data.success) {
                navigate('/investigations');
            }
        } catch (err) {
            alert("Error starting investigation");
        }
    };

    if (loading) return <div className="loading-state">Loading Alerts...</div>;
    if (error) return <div className="error-state">{error}</div>;

    return (
        <div className="alerts-container">
            <div className="page-header">
                <h2>Real-Time Threat Alert Center</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={fetchAlerts}>Refresh</button>
                </div>
            </div>

            <div className="alerts-list">
                {alerts.length === 0 ? (
                    <div className="empty-state">No active alerts detected.</div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`alert-card glass-card border-${alert.severity.toLowerCase()}`}>
                            <div className="alert-header">
                                <div className="alert-title">
                                    <span className={`severity-badge ${alert.severity.toLowerCase()}`}>
                                        {alert.severity}
                                    </span>
                                    <h3>{alert.title}</h3>
                                </div>
                                <div className="alert-meta">
                                    <span className="risk-score">Risk Score: {alert.risk_score}/100</span>
                                    <span className="timestamp">Detected: {new Date(alert.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="alert-body">
                                <p>{alert.description}</p>
                                <div className="alert-status">Status: <strong>{alert.status}</strong></div>
                            </div>

                            <div className="alert-actions">
                                {alert.status === 'NEW' && (
                                    <>
                                        <button className="btn-primary" onClick={() => handleInvestigate(alert)}>Investigate</button>
                                        <button className="btn-secondary" onClick={() => updateAlertStatus(alert.id, 'ACKNOWLEDGED')}>Acknowledge</button>
                                    </>
                                )}
                                {alert.status === 'ACKNOWLEDGED' && (
                                    <button className="btn-primary" onClick={() => handleInvestigate(alert)}>Investigate</button>
                                )}
                                {alert.status !== 'RESOLVED' && (
                                    <button className="btn-ghost" onClick={() => updateAlertStatus(alert.id, 'RESOLVED')}>Mark Resolved</button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Alerts;
