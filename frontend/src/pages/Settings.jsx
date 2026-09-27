import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Key, History, Smartphone, Check, X, Palette, Eye } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

const Settings = () => {
    const { user, checkAuth } = useAuth();
    const { 
        themeMode, setThemeMode, 
        accentColor, setAccentColor, 
        density, setDensity, 
        reducedMotion, setReducedMotion, 
        highContrast, setHighContrast, 
        glassEffects, setGlassEffects 
    } = useTheme();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // MFA Setup
    const [mfaSetupData, setMfaSetupData] = useState(null);
    const [mfaCode, setMfaCode] = useState('');
    const [enablingMfa, setEnablingMfa] = useState(false);
    
    // MFA Disable
    const [disableMfaPassword, setDisableMfaPassword] = useState('');
    const [disablingMfa, setDisablingMfa] = useState(false);

    // Login History
    const [loginHistory, setLoginHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/auth/login_history');
                setLoginHistory(res.data.history);
            } catch (err) {
                console.error("Failed to fetch history");
            }
        };
        fetchHistory();
    }, []);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error("New passwords do not match.");
        }
        setChangingPassword(true);
        try {
            await axios.post('http://localhost:5000/api/auth/password/change', {
                current_password: currentPassword,
                new_password: newPassword
            });
            toast.success("Password changed successfully.");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    const startMfaSetup = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/mfa/setup');
            setMfaSetupData(res.data);
        } catch (err) {
            toast.error("Failed to initiate MFA setup.");
        }
    };

    const handleEnableMfa = async (e) => {
        e.preventDefault();
        setEnablingMfa(true);
        try {
            await axios.post('http://localhost:5000/api/auth/mfa/enable', {
                secret: mfaSetupData.secret,
                code: mfaCode
            });
            toast.success("MFA Enabled successfully.");
            setMfaSetupData(null);
            setMfaCode('');
            await checkAuth(); // Refresh user data
        } catch (err) {
            toast.error(err.response?.data?.error || "Invalid MFA code.");
        } finally {
            setEnablingMfa(false);
        }
    };

    const handleDisableMfa = async (e) => {
        e.preventDefault();
        setDisablingMfa(true);
        try {
            await axios.post('http://localhost:5000/api/auth/mfa/disable', {
                password: disableMfaPassword
            });
            toast.success("MFA Disabled successfully.");
            setDisableMfaPassword('');
            await checkAuth();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to disable MFA.");
        } finally {
            setDisablingMfa(false);
        }
    };

    return (
        <div className="settings-container fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title"><Shield className="header-icon" /> Security Settings</h1>
                    <p className="page-subtitle">Manage your account security and authentication methods</p>
                </div>
            </header>

            <div className="settings-grid" style={{ marginBottom: '2rem' }}>
                <div className="settings-column">
                    <div className="settings-card">
                        <div className="card-header">
                            <h2><Palette size={20} /> Appearance</h2>
                        </div>
                        <div className="settings-form">
                            <div className="form-group">
                                <label>Theme Mode</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['dark', 'light', 'system'].map(mode => (
                                        <button 
                                            key={mode}
                                            className={`btn-cyber ${themeMode === mode ? 'btn-primary-cyber' : 'btn-ghost-cyber'}`}
                                            onClick={() => setThemeMode(mode)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}
                                            aria-pressed={themeMode === mode}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Accent Color</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['blue', 'cyan', 'purple'].map(color => (
                                        <button 
                                            key={color}
                                            className={`btn-cyber ${accentColor === color ? 'btn-primary-cyber' : 'btn-ghost-cyber'}`}
                                            onClick={() => setAccentColor(color)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}
                                            aria-pressed={accentColor === color}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Layout Density</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['compact', 'comfortable'].map(d => (
                                        <button 
                                            key={d}
                                            className={`btn-cyber ${density === d ? 'btn-primary-cyber' : 'btn-ghost-cyber'}`}
                                            onClick={() => setDensity(d)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}
                                            aria-pressed={density === d}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
                                <input type="checkbox" id="glassToggle" checked={glassEffects} onChange={e => setGlassEffects(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="glassToggle" style={{ margin: 0, cursor: 'pointer' }}>Enable Glass Panels</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-column">
                    <div className="settings-card">
                        <div className="card-header">
                            <h2><Eye size={20} /> Accessibility</h2>
                        </div>
                        <div className="settings-form">
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <input type="checkbox" id="motionToggle" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="motionToggle" style={{ margin: 0, cursor: 'pointer' }}>Reduce Motion (Disable animations)</label>
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input type="checkbox" id="contrastToggle" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="contrastToggle" style={{ margin: 0, cursor: 'pointer' }}>High Contrast</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-grid">
                <div className="settings-column">
                    {/* Password Section */}
                    <div className="settings-card">
                        <div className="card-header">
                            <h2><Key size={20} /> Change Password</h2>
                        </div>
                        <form onSubmit={handleChangePassword} className="settings-form">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input 
                                    type="password" 
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                                <small>Must be at least 12 characters, include upper/lowercase, number, and special character.</small>
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-primary" disabled={changingPassword}>
                                {changingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
                            </button>
                        </form>
                    </div>

                    {/* MFA Section */}
                    <div className="settings-card">
                        <div className="card-header">
                            <h2><Smartphone size={20} /> Multi-Factor Authentication</h2>
                        </div>
                        
                        {user?.mfa_enabled ? (
                            <div className="mfa-enabled-section">
                                <div className="status-badge success">
                                    <Check size={16} /> MFA is Enabled
                                </div>
                                <p>Your account is protected by an authenticator app.</p>
                                
                                <form onSubmit={handleDisableMfa} className="settings-form" style={{marginTop: '20px'}}>
                                    <div className="form-group">
                                        <label>Enter password to disable MFA</label>
                                        <input 
                                            type="password"
                                            value={disableMfaPassword}
                                            onChange={e => setDisableMfaPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn-danger" disabled={disablingMfa}>
                                        {disablingMfa ? 'DISABLING...' : 'DISABLE MFA'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="mfa-setup-section">
                                {!mfaSetupData ? (
                                    <>
                                        <div className="status-badge warning">
                                            <X size={16} /> MFA is Disabled
                                        </div>
                                        <p>Secure your account with TOTP multi-factor authentication.</p>
                                        <button onClick={startMfaSetup} className="btn-primary">SETUP MFA</button>
                                    </>
                                ) : (
                                    <div className="mfa-qr-container">
                                        <h3>Scan QR Code</h3>
                                        <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                        <img src={mfaSetupData.qr_code} alt="MFA QR Code" className="qr-code" />
                                        
                                        <form onSubmit={handleEnableMfa} className="settings-form">
                                            <div className="form-group">
                                                <label>Enter 6-digit code</label>
                                                <input 
                                                    type="text" 
                                                    maxLength="6"
                                                    value={mfaCode}
                                                    onChange={e => setMfaCode(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-actions">
                                                <button type="submit" className="btn-primary" disabled={enablingMfa}>
                                                    VERIFY & ENABLE
                                                </button>
                                                <button type="button" className="btn-secondary" onClick={() => setMfaSetupData(null)}>
                                                    CANCEL
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="settings-column">
                    {/* Login History */}
                    <div className="settings-card history-card">
                        <div className="card-header">
                            <h2><History size={20} /> Recent Login Activity</h2>
                        </div>
                        <div className="history-list">
                            {loginHistory.map((log) => (
                                <div key={log.id} className="history-item">
                                    <div className="history-icon">
                                        {log.success ? (
                                            <div className="icon-circle success"><Check size={14} /></div>
                                        ) : (
                                            <div className="icon-circle danger"><X size={14} /></div>
                                        )}
                                    </div>
                                    <div className="history-details">
                                        <h4>{log.success ? 'Successful Login' : 'Failed Login'}</h4>
                                        <span className="history-meta">{new Date(log.timestamp).toLocaleString()}</span>
                                        <span className="history-meta">{log.ip_address} • {log.user_agent.split(' ')[0]}</span>
                                        {!log.success && log.failure_reason && (
                                            <span className="history-reason">{log.failure_reason}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loginHistory.length === 0 && <p>No recent activity.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
