import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Layout wrapper for pages to include sidebar
const MainLayout = ({ children }) => (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <GlobalHeader />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
);

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ className: 'soc-toast', style: { background: '#111', color: '#0f0', border: '1px solid #0f0' } }} />
        <Routes>
          <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/alerts" element={<MainLayout><Alerts /></MainLayout>} />
          <Route path="/investigations" element={<MainLayout><Investigations /></MainLayout>} />
          <Route path="/live" element={<MainLayout><LiveMonitoring /></MainLayout>} />
          <Route path="/upload" element={<MainLayout><Upload /></MainLayout>} />
          <Route path="/history" element={<MainLayout><History /></MainLayout>} />
          <Route path="/performance" element={<MainLayout><ModelPerformance /></MainLayout>} />
          <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
