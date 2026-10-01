import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { API_BASE_URL } from '../api';
import { Search } from 'lucide-react';
import './GlobalHeader.css';

const GlobalHeader = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`, { withCredentials: true });
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error("Error fetching notifications", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSelectedIndex(0);

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
        if (res.data.success) {
          setSearchResults(res.data.results);
        } else {
          setSearchError("Unable to search right now. Please try again.");
        }
      } catch (err) {
        setSearchError("Unable to search right now. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const executeResult = (index) => {
    if (searchResults.length > 0 && searchResults[index]) {
      const route = searchResults[index].route;
      setShowSearch(false);
      navigate(route);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeResult(selectedIndex);
    }
  };

  return (
    <div className="global-header glass-panel">
      <div className="header-left">
        <div 
          className="search-trigger" 
          onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }}
        >
          <Search size={16} className="search-icon" style={{ color: 'var(--text-muted)' }} />
          <span className="search-text">Search (Ctrl + K)</span>
        </div>
      </div>

      <div className="header-right">
        <div className="notification-wrapper" ref={dropdownRef}>
          <button 
            className="btn-icon bell-btn" 
            onClick={() => setShowDropdown(!showDropdown)}
          >
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          
          {showDropdown && (
            <div className="notification-dropdown glass-card">
              <div className="dropdown-header">
                <h4>Notifications</h4>
                <button className="btn-link">Mark all read</button>
              </div>
              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <div className="empty-state">No new notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}>
                      <div className={`severity-indicator ${n.severity.toLowerCase()}`}></div>
                      <div className="notification-content">
                         <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="search-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSearch(false); }}>
          <div className="search-modal glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
              <form onSubmit={(e) => { e.preventDefault(); executeResult(selectedIndex); }} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search 
                  size={20} 
                  style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    color: 'var(--text-muted)', 
                    pointerEvents: 'none' 
                  }} 
                />
                <input 
                  ref={searchRef}
                  type="text" 
                  placeholder="Search Threat IDs, IPs, Attack types..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  style={{ 
                    paddingLeft: '44px', 
                    width: '100%', 
                    background: 'rgba(0,0,0,0.3)', 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: '8px', 
                    padding: '12px 12px 12px 44px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </form>
            </div>

            <div className="search-results" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {searchQuery.trim() === '' ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Start typing to search across alerts, investigations, and predictions...
                </div>
              ) : searchLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                   Searching...
                </div>
              ) : searchError ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--danger)' }}>
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No results found
                </div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {searchResults.map((result, idx) => (
                    <div 
                      key={`${result.type}-${result.id}`}
                      onClick={() => executeResult(idx)}
                      style={{ 
                        padding: '12px 24px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: selectedIndex === idx ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        borderLeft: selectedIndex === idx ? '3px solid var(--primary-accent)' : '3px solid transparent'
                      }}
                    >
                      <div style={{ fontSize: '1.2rem' }}>
                        {result.type === 'alert' ? '⚠' : result.type === 'investigation' ? '🔎' : '📊'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                           {result.title}
                           {result.severity && (
                             <span className={`status-badge ${result.severity.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                               {result.severity}
                             </span>
                           )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {result.id} • {result.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalHeader;
