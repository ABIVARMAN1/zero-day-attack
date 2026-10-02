import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import AuthPortal from '../pages/AuthPortal';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="loading-screen">Authenticating...</div>;
    }

    if (!user) {
        return <AuthPortal />;
    }

    return children;
};

export default ProtectedRoute;
