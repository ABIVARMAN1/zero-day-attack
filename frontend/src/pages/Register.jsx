import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import './Login.css'; // Reusing SOC-style login theme

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
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
            
            // Redirect to MFA Setup
            if (res.mfa_setup_required) {
                navigate('/mfa-setup');
            } else {
                navigate('/login');
            }
        } catch (error) {
            const msg = error.response?.data?.error || 'Registration failed';
            toast.error(msg);
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
                        Register your identity to access the AI-Driven Zero-Day SOC.
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
                                Already have an account? <Link to="/login" style={{ color: '#00ffff', textDecoration: 'none', marginLeft: '5px' }}>[ Sign In ]</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
