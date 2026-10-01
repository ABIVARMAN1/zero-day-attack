import React, { createContext, useContext, useState, useEffect } from 'react';
import axios, { API_BASE_URL } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
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
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
        if (response.data.success) {
            setUser(response.data.user);
        }
        return response.data;
    };

    const register = async (name, email, password) => {
        const response = await axios.post(`${API_BASE_URL}/api/auth/register`, { name, email, password });
        // The backend returns success and an mfa_pending cookie.
        // It does not immediately set a full user context until MFA is setup.
        return response.data;
    };

    const verifyMfa = async (code) => {
        const response = await axios.post(`${API_BASE_URL}/api/auth/mfa/verify`, { code });
        if (response.data.success) {
            setUser(response.data.user);
        }
        return response.data;
    };

    const logout = async () => {
        await axios.post(`${API_BASE_URL}/api/auth/logout`);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyMfa, logout, loading, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
