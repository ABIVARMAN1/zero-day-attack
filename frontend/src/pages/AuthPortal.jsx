import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertTriangle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import './Login.css';

const AuthPortal = () => {
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'mfa'
    
    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    
    const [loading, setLoading] = useState(false);

    const { login, register, verifyMfa } = useAuth();
    const navigate = useNavigate();

    // Password strength logic
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
                setMode('mfa');
            } else {
                toast.success('Authentication successful');
            }
        } catch (error) {
            const status = error.response?.status;
            let msg = error.response?.data?.error || 'Authentication failed';
            
            if (status === 401) msg = 'Invalid credentials or Authentication required';
            else if (status === 403) msg = 'Access denied';
            else if (status === 404) msg = 'Authentication endpoint not found';
            else if (status >= 500) msg = 'Server error occurred during authentication';
            else if (!error.response) msg = 'Network failure: Backend is unavailable';
            
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return toast.error("Passwords do not match.");
        }
        
        if (strength < 5) {
            return toast.error("Please meet all password requirements.");
        }

        setLoading(true);
        try {
            const res = await register(name, email, password);
            toast.success("Account created successfully.");
            
            if (res.mfa_setup_required) {
                navigate('/mfa-setup');
            } else {
                setMode('login');
            }
        } catch (error) {
            const status = error.response?.status;
            let msg = error.response?.data?.error || 'Registration failed';
            
            if (status >= 500) msg = 'Server error occurred during registration';
            else if (!error.response) msg = 'Network failure: Backend is unavailable';
            
            toast.error(msg);
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
                        
                        {mode === 'login' && (
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
                                </div>

                                <div className="form-options">
                                    <label className="remember-me">
                                        <input type="checkbox" />
                                        <span>Remember me</span>
                                    </label>
                                    <span style={{ cursor: 'pointer', color: '#8da4be', fontSize: '14px' }} onClick={() => navigate('/forgot-password')}>Forgot password?</span>
                                </div>

                                <button type="submit" className="login-btn" disabled={loading}>
                                    {loading ? 'Authenticating...' : 'INITIALIZE LOGIN'}
                                </button>
                                
                                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#8da4be' }}>
                                    Don't have an account? <span onClick={() => setMode('register')} style={{ color: '#00ffff', cursor: 'pointer', marginLeft: '5px' }}>[ Create Account ]</span>
                                </div>
                            </form>
                        )}

                        {mode === 'register' && (
                            <form onSubmit={handleRegisterSubmit} className="login-form">
                                <h2>CREATE SECURE ACCOUNT</h2>
                                
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <div className="input-with-icon">
                                        <User size={18} />
                                        <input 
                                            type="text" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Email Address</label>
                                    <div className="input-with-icon">
                                        <Mail size={18} />
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="john.doe@soc.local"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Password</label>
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
                                        <div className="password-strength" style={{ marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span>Password Strength</span>
                                                <span style={{ color: strengthColor, fontWeight: 'bold' }}>{strengthLabel}</span>
                                            </div>
                                            <div className="strength-bar-container">
                                                <div 
                                                    className="strength-bar" 
                                                    style={{ width: `${(strength / 5) * 100}%`, backgroundColor: strengthColor }}
                                                ></div>
                                            </div>
                                            <div className="strength-reqs" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                                <span className={password.length >= 12 ? 'met' : ''}>✓ 12+ characters</span>
                                                <span className={/[A-Z]/.test(password) ? 'met' : ''}>✓ Uppercase</span>
                                                <span className={/[a-z]/.test(password) ? 'met' : ''}>✓ Lowercase</span>
                                                <span className={/\d/.test(password) ? 'met' : ''}>✓ Number</span>
                                                <span className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'met' : ''}>✓ Special character</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Confirm Password</label>
                                    <div className="input-with-icon">
                                        <Lock size={18} />
                                        <input 
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            required
                                        />
                                        <button 
                                            type="button" 
                                            className="toggle-password"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <span style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                            Passwords do not match.
                                        </span>
                                    )}
                                </div>

                                <button type="submit" className="login-btn" disabled={loading || password !== confirmPassword || strength < 5}>
                                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                                </button>
                                
                                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#8da4be' }}>
                                    Already have an account? <span onClick={() => setMode('login')} style={{ color: '#00ffff', cursor: 'pointer', marginLeft: '5px' }}>[ Sign In ]</span>
                                </div>
                            </form>
                        )}

                        {mode === 'mfa' && (
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
                                
                                <button type="button" className="btn-link" onClick={() => setMode('login')}>
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

export default AuthPortal;
