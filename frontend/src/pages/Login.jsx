import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isMfaStep, setIsMfaStep] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, verifyMfa } = useAuth();
    const navigate = useNavigate();

    // Password strength logic (Frontend UX only)
    const getStrength = (pass) => {
        let score = 0;
        if (pass.length >= 12) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[a-z]/.test(pass)) score += 1;
        if (/\d/.test(pass)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;
        return score;
    };

    const strength = getStrength(password);
    const strengthLabel = strength < 3 ? 'Weak' : strength < 5 ? 'Medium' : 'Strong';
    const strengthColor = strength < 3 ? '#ff4444' : strength < 5 ? '#ffbb33' : '#00C851';

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await login(email, password);
            if (res.mfa_required) {
                setIsMfaStep(true);
            } else {
                toast.success('Authentication successful');
                navigate('/');
            }
        } catch (error) {
            const msg = error.response?.data?.error || 'Network error';
            toast.error(`Authentication failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMfaSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyMfa(mfaCode);
            toast.success('MFA verification successful');
            navigate('/');
        } catch (error) {
            const msg = error.response?.data?.error || 'Invalid code';
            toast.error(`MFA verification failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-grid-bg"></div>
            
            <div className="login-content">
                <div className="login-left">
                    <div className="soc-brand">
                        <Shield size={48} className="soc-logo-icon" />
                        <h1>AI-Driven Zero-Day SOC</h1>
                    </div>
                    <p className="soc-desc">
                        Advanced heuristic analysis and machine learning-powered anomaly detection for enterprise network security.
                    </p>
                    <div className="security-status">
                        <div className="status-indicator">
                            <span className="pulse-dot green"></span>
                            <span>System Online</span>
                        </div>
                        <div className="status-indicator">
                            <span className="pulse-dot green"></span>
                            <span>Defense Matrix Active</span>
                        </div>
                    </div>
                </div>

                <div className="login-right">
                    <div className="login-card">
                        {!isMfaStep ? (
                            <form onSubmit={handleLoginSubmit} className="login-form">
                                <h2>Authenticate Session</h2>
                                
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <div className="input-with-icon">
                                        <User size={18} />
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@soc.local"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Secure Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} />
                                        <input 
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            required
                                        />
                                        <button 
                                            type="button" 
                                            className="toggle-password"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    
                                    {password.length > 0 && (
                                        <div className="password-strength">
                                            <div className="strength-bar-container">
                                                <div 
                                                    className="strength-bar" 
                                                    style={{ width: `${(strength / 5) * 100}%`, backgroundColor: strengthColor }}
                                                ></div>
                                            </div>
                                            <span style={{ color: strengthColor }}>{strengthLabel}</span>
                                            <div className="strength-reqs">
                                                <span className={password.length >= 12 ? 'met' : ''}>✓ 12+ chars</span>
                                                <span className={/[A-Z]/.test(password) ? 'met' : ''}>✓ Upper</span>
                                                <span className={/[a-z]/.test(password) ? 'met' : ''}>✓ Lower</span>
                                                <span className={/\d/.test(password) ? 'met' : ''}>✓ Num</span>
                                                <span className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'met' : ''}>✓ Special</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-options">
                                    <label className="remember-me">
                                        <input type="checkbox" />
                                        <span>Remember me</span>
                                    </label>
                                    <Link to="/forgot-password">Forgot password?</Link>
                                </div>

                                <button type="submit" className="login-btn" disabled={loading}>
                                    {loading ? 'Authenticating...' : 'INITIALIZE LOGIN'}
                                </button>
                                
                                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#8da4be' }}>
                                    Don't have an account? <Link to="/register" style={{ color: '#00ffff', textDecoration: 'none', marginLeft: '5px' }}>[ Create Account ]</Link>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleMfaSubmit} className="login-form mfa-form">
                                <h2>Verify Identity</h2>
                                <AlertTriangle size={32} className="mfa-icon" />
                                <p>Enter the 6-digit authentication code from your authenticator app.</p>
                                
                                <div className="form-group">
                                    <input 
                                        type="text" 
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="mfa-input"
                                        required
                                        maxLength="6"
                                        pattern="\d{6}"
                                    />
                                </div>

                                <button type="submit" className="login-btn" disabled={loading || mfaCode.length !== 6}>
                                    {loading ? 'Verifying...' : 'VERIFY CODE'}
                                </button>
                                
                                <button type="button" className="btn-link" onClick={() => setIsMfaStep(false)}>
                                    Back to login
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
