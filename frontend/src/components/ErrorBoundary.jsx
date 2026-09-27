import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', minHeight: '400px',
          color: 'var(--text-color)', padding: '2rem', textAlign: 'center'
        }}>
          <FaExclamationTriangle size={64} style={{ color: '#ef4444', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-bright)' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>
            The module could not be loaded. Please try again or return to the dashboard.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn-cyber btn-primary-cyber"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              Retry
            </button>
            <Link to="/" className="btn-cyber btn-ghost-cyber" style={{ textDecoration: 'none' }}>
              Return to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
