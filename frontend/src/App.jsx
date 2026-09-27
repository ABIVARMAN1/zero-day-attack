import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Investigations from './pages/Investigations';
import Upload from './pages/Upload';
import Reports from './pages/Reports';
import History from './pages/History';
import LiveMonitoring from './pages/LiveMonitoring';
import ModelPerformance from './pages/ModelPerformance';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterMfaSetup from './pages/RegisterMfaSetup';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Layout wrapper for authenticated pages to include sidebar
const ProtectedLayout = ({ children }) => (
  <ProtectedRoute>
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <GlobalHeader />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ className: 'soc-toast', style: { background: '#111', color: '#0f0', border: '1px solid #0f0' } }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mfa-setup" element={<RegisterMfaSetup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/alerts" element={<ProtectedLayout><Alerts /></ProtectedLayout>} />
          <Route path="/investigations" element={<ProtectedLayout><Investigations /></ProtectedLayout>} />
          <Route path="/live" element={<ProtectedLayout><LiveMonitoring /></ProtectedLayout>} />
          <Route path="/upload" element={<ProtectedLayout><Upload /></ProtectedLayout>} />
          <Route path="/history" element={<ProtectedLayout><History /></ProtectedLayout>} />
          <Route path="/performance" element={<ProtectedLayout><ModelPerformance /></ProtectedLayout>} />
          <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
