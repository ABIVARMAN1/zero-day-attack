import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { API_BASE_URL } from '../api';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import './Login.css';

const RegisterMfaSetup = () => {
    const [mfaSetupData, setMfaSetupData] = useState(null);
    const [mfaCode, setMfaCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch MFA setup details automatically
        const initMfa = async () => {
            try {
                const res = await axios.post(`${"$"}{API_BASE_URL}/api/auth/mfa/setup`);
                setMfaSetupData(res.data);
            } catch (err) {
                toast.error("Failed to initialize MFA setup. Please log in and try again.");
                navigate('/login');
            }
        };
        initMfa();
    }, [navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${"$"}{API_BASE_URL}/api/auth/mfa/enable`, {
                secret: mfaSetupData.secret,
                code: mfaCode
            });
            setSuccess(true);
            toast.success("MFA Enabled Successfully!");
            setTimeout(() => {
                navigate('/login'); // Proceed to login screen after success
            }, 2000);
        } catch (error) {
            toast.error(error.response?.data?.error || "Invalid verification code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-grid-bg"></div>
            
            <div className="login-content" style={{ width: '600px' }}>
                <div className="login-right" style={{ borderLeft: 'none', padding: '40px' }}>
                    <div className="login-card">
                        {!success ? (
                            <form onSubmit={handleVerify} className="login-form mfa-form">
                                <Shield size={48} className="soc-logo-icon" style={{ margin: '0 auto 15px auto', display: 'block' }} />
                                <h2>SECURE YOUR ACCOUNT</h2>
                                <p>Set up multi-factor authentication to protect your SOC account.</p>

                                {mfaSetupData ? (
                                    <>
                                        <div style={{ backgroundColor: '#fff', padding: '15px', display: 'inline-block', borderRadius: '8px', marginBottom: '20px' }}>
                                            <img src={mfaSetupData.qr_code} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                                        </div>
                                        
                                        <div style={{ marginBottom: '25px', color: '#8da4be', fontSize: '14px' }}>
                                            Authenticator setup key<br/>
                                            <strong style={{ letterSpacing: '2px', color: '#fff', fontSize: '16px' }}>{mfaSetupData.secret}</strong>
                                        </div>
                                        
                                        <div className="form-group" style={{ textAlign: 'left' }}>
                                            <label>Enter 6-digit verification code</label>
                                            <input 
                                                type="text" 
                                                value={mfaCode}
                                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="0 0 0 0 0 0"
                                                className="mfa-input"
                                                required
                                                maxLength="6"
                                                pattern="\d{6}"
                                            />
                                        </div>

                                        <button type="submit" className="login-btn" disabled={loading || mfaCode.length !== 6}>
                                            {loading ? 'VERIFYING...' : 'VERIFY & ENABLE MFA'}
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ padding: '50px 0', color: '#00ffff' }}>Initializing Secure Key Exchange...</div>
                                )}
                            </form>
                        ) : (
                            <div className="login-form mfa-form">
                                <CheckCircle size={64} style={{ color: '#00C851', margin: '0 auto 20px auto', display: 'block' }} />
                                <h2 style={{ color: '#00C851' }}>ACCOUNT PROTECTED</h2>
                                <p style={{ color: '#fff', fontSize: '16px' }}>✓ Multi-factor authentication enabled.</p>
                                <p style={{ color: '#8da4be', marginTop: '20px' }}>Redirecting to secure login...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterMfaSetup;
