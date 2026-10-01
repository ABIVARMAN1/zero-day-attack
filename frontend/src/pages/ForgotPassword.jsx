import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios, { API_BASE_URL } from '../api';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';
import './Login.css'; // Reuse login styles

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/password/forgot`, { email });
            toast.success('If an account exists, a reset link has been sent.');
        } catch (error) {
            // Ignore errors for security to prevent email enumeration
            toast.success('If an account exists, a reset link has been sent.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-grid-bg"></div>
            
            <div className="login-content" style={{ width: '500px' }}>
                <div className="login-right" style={{ borderLeft: 'none' }}>
                    <div className="login-card">
                        <form onSubmit={handleSubmit} className="login-form">
                            <h2>Reset Password</h2>
                            
                            <p style={{ color: '#8da4be', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <div className="form-group">
                                <label>Email Address</label>
                                <div className="input-with-icon">
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@soc.local"
                                        required
                                        style={{ paddingLeft: '15px' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="login-btn" disabled={loading}>
                                {loading ? 'SENDING...' : 'SEND RESET LINK'}
                            </button>
                            
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Link to="/login" style={{ color: '#00ffff', textDecoration: 'none' }}>Return to Login</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
