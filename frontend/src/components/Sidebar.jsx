import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaUpload, FaHistory, FaShieldAlt, FaBolt, FaServer, FaChevronRight, FaCog, FaSignOutAlt, FaUserCircle, FaFileAlt } from 'react-icons/fa';
import { MdSecurity, MdMenu } from 'react-icons/md';
import { Moon, Sun, Monitor } from 'lucide-react';
import axios, { API_BASE_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [backendOnline, setBackendOnline] = useState(false);
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await axios.get(`${"$"}{API_BASE_URL}/api/health`, { timeout: 2000 });
        setBackendOnline(true);
      } catch { setBackendOnline(false); }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/',        icon: <FaHome />,    label: 'Dashboard',       sub: 'Overview' },
    { to: '/alerts',  icon: <FaShieldAlt />, label: 'Alert Center',  sub: 'Active threats' },
    { to: '/investigations', icon: <FaHistory />, label: 'Investigations', sub: 'Threat analysis' },
    { to: '/live',    icon: <FaServer />,  label: 'Live Monitor',    sub: 'Real-time traffic' },
    { to: '/upload',  icon: <FaBolt />,    label: 'Prediction',      sub: 'Analyze traffic' },
    { to: '/history', icon: <FaHistory />, label: 'Audit Logs',      sub: 'Event history' },
    { to: '/performance', icon: <FaShieldAlt />, label: 'AI Models', sub: 'Performance' },
    { to: '/reports', icon: <FaFileAlt />, label: 'Reports', sub: 'Compliance' },
    { to: '/settings', icon: <FaCog />, label: 'Security', sub: 'Authentication' },
  ];

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)} aria-label="Open Menu">
        <MdMenu />
      </button>

      {isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

      <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-inner">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="icon-box" title="ZeroDayAI">
              <div className="logo-icon-wrapper">
                <MdSecurity style={{ color: '#00d4ff', fontSize: '1.5rem' }} />
              </div>
            </div>
            <div className="text-box logo-text">
              <div className="logo-title">Zero<span>Day</span>AI</div>
              <div className="logo-subtitle">IDS · v2.0</div>
            </div>
          </div>
          
          {/* Live clock */}
          <div className="sidebar-clock">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
              {time.toLocaleDateString([], { day: '2-digit', month: 'short' })}
            </span>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            <div className="nav-section-label">NAVIGATION</div>

            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`nav-link-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {isActive && <div className="nav-active-bar" />}
                  <div className="icon-box nav-icon">{item.icon}</div>
                  <div className="text-box nav-text-content">
                    <div className="nav-label">{item.label}</div>
                    <div className={`nav-sub ${isActive ? 'active' : ''}`}>
                      {item.sub}
                    </div>
                  </div>
                  {isActive && (
                    <FaChevronRight className="nav-chevron" />
                  )}
                </NavLink>
              );
            })}

            {/* System info section */}
            <div className="nav-section-label" style={{ marginTop: '1.5rem' }}>SYSTEM</div>
            <div className="system-info-box">
              <div className="system-api-row" title="Backend API">
                <div className="icon-box system-api-icon">
                  <FaServer />
                </div>
                <div className="text-box system-api-text">
                  <span className="system-api-label">Backend API</span>
                  <span className={`system-api-status ${backendOnline ? 'online' : 'offline'}`}>
                    {backendOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <div className="model-badges">
                {['IsoForest', 'XGBoost'].map(model => (
                  <div key={model} className="model-badge">
                    {model}
                  </div>
                ))}
              </div>
            </div>
          </nav>

          {/* Footer status */}
          <div className="sidebar-footer">
            <div className="user-profile-row">
                <div className="icon-box user-avatar" title={user?.username || 'Admin'}>
                  <FaUserCircle size={24} color="#00ffff" />
                </div>
                <div className="text-box user-info">
                    <div className="user-name">{user?.username || 'Admin'}</div>
                    <div className="user-session">
                        <div className="session-dot"></div>
                        Secure Session
                    </div>
                </div>
                <div className="user-actions">
                  <button onClick={toggleTheme} className="action-btn" title="Toggle Theme">
                      {themeMode === 'dark' ? <Moon size={16} /> : themeMode === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
                  </button>
                  <button onClick={handleLogout} className="action-btn logout-btn" title="Logout">
                      <FaSignOutAlt size={16} />
                  </button>
                </div>
            </div>
            <div className="system-status-card" title="System Operational">
              <div className="status-row">
                <div className="icon-box">
                  <div className="status-dot" />
                </div>
                <div className="text-box status-text">
                  System Operational
                </div>
              </div>
              <div className="status-port">
                {backendOnline ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className="footer-copyright">
              ZeroDayAI © 2026 · ML Security Suite
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
