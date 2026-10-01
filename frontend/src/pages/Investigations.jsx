import React, { useState, useEffect } from 'react';
import axios, { API_BASE_URL } from '../api';
import './Investigations.css';

const Investigations = () => {
    const [investigations, setInvestigations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvestigations();
    }, []);

    const fetchInvestigations = async () => {
        try {
            const res = await axios.get(`${"$"}{API_BASE_URL}/api/investigations`, { withCredentials: true });
            if (res.data.success) {
                setInvestigations(res.data.investigations);
            }
        } catch (err) {
            console.error("Error fetching investigations", err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const res = await axios.patch(`${API_BASE_URL}/api/investigations/${id}`, { status }, { withCredentials: true });
            if (res.data.success) {
                fetchInvestigations();
            }
        } catch (err) {
            alert("Failed to update status");
        }
    };

    if (loading) return <div className="loading-state">Loading Investigations...</div>;

    return (
        <div className="investigations-container">
            <div className="page-header">
                <h2>Active Investigations</h2>
                <button className="btn-secondary" onClick={fetchInvestigations}>Refresh</button>
            </div>

            {investigations.length === 0 ? (
                <div className="glass-card empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No Active Investigations</h3>
                    <p style={{ color: 'var(--text-muted)' }}>There are currently no open investigations requiring attention.</p>
                </div>
            ) : (
                <div className="investigations-grid">
                    {investigations.map(inv => (
                        <div key={inv.id} className="investigation-card glass-card">
                            <div className="inv-header">
                                <h3>Investigation #{inv.id}</h3>
                                <span className={`status-badge ${inv.status.toLowerCase()}`}>{inv.status}</span>
                            </div>
                            <div className="inv-body">
                                <p><strong>Alert ID:</strong> {inv.alert_id}</p>
                                <p><strong>Assigned To:</strong> User #{inv.assigned_to}</p>
                                <div className="inv-notes">
                                    <strong>Notes:</strong>
                                    <textarea 
                                        defaultValue={inv.notes} 
                                        className="notes-input"
                                        placeholder="Add investigation notes here..."
                                    />
                                </div>
                            </div>
                            <div className="inv-footer">
                                <small>Created: {new Date(inv.created_at).toLocaleString()}</small>
                                <div className="inv-actions">
                                    {inv.status !== 'RESOLVED' && (
                                        <button className="btn-primary" onClick={() => updateStatus(inv.id, 'RESOLVED')}>Resolve</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Investigations;
