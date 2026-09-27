import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios to send credentials
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/auth/me');
            setUser(response.data.user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        if (response.data.success) {
            setUser(response.data.user);
        }
        return response.data;
    };

    const register = async (name, email, password) => {
        const response = await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
        // The backend returns success and an mfa_pending cookie.
        // It does not immediately set a full user context until MFA is setup.
        return response.data;
    };

    const verifyMfa = async (code) => {
        const response = await axios.post('http://localhost:5000/api/auth/mfa/verify', { code });
        if (response.data.success) {
            setUser(response.data.user);
        }
        return response.data;
    };

    const logout = async () => {
        await axios.post('http://localhost:5000/api/auth/logout');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyMfa, logout, loading, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
