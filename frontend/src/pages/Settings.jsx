import React from 'react';
import { Palette, Eye } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

const Settings = () => {
    const { 
        themeMode, setThemeMode, 
        accentColor, setAccentColor, 
        density, setDensity, 
        reducedMotion, setReducedMotion, 
        highContrast, setHighContrast, 
        glassEffects, setGlassEffects 
    } = useTheme();

    return (
        <div className="settings-container fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title"><Palette className="header-icon" /> Settings</h1>
                    <p className="page-subtitle">Manage application preferences and appearance</p>
                </div>
            </header>

            <div className="settings-grid" style={{ marginBottom: '2rem' }}>
                <div className="settings-column">
                    <div className="settings-card">
                        <div className="card-header">
                            <h2><Palette size={20} /> Appearance</h2>
                        </div>
                        <div className="settings-form">
                            <div className="form-group">
                                <label>Theme Mode</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['dark', 'light', 'system'].map(mode => (
                                        <button 
                                            key={mode}
                                            className={`btn-cyber ${themeMode === mode ? 'btn-primary-cyber' : 'btn-ghost-cyber'}`}
                                            onClick={() => setThemeMode(mode)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}
                                            aria-pressed={themeMode === mode}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Accent Color</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['blue', 'cyan', 'purple'].map(color => (
                                        <button 
                                            key={color}
                                            className={`btn-cyber ${accentColor === color ? 'btn-primary-cyber' : 'btn-ghost-cyber'}`}
                                            onClick={() => setAccentColor(color)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}
                                            aria-pressed={accentColor === color}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Layout Density</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['compact', 'comfortable'].map(d => (
                                        <button 
                                            key={d}
                                            className={`btn-cyber ${density === d ? 'btn-primary-cyber' : 'btn-ghost-cyber'}`}
                                            onClick={() => setDensity(d)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}
                                            aria-pressed={density === d}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
                                <input type="checkbox" id="glassToggle" checked={glassEffects} onChange={e => setGlassEffects(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="glassToggle" style={{ margin: 0, cursor: 'pointer' }}>Enable Glass Panels</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-column">
                    <div className="settings-card">
                        <div className="card-header">
                            <h2><Eye size={20} /> Accessibility</h2>
                        </div>
                        <div className="settings-form">
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <input type="checkbox" id="motionToggle" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="motionToggle" style={{ margin: 0, cursor: 'pointer' }}>Reduce Motion (Disable animations)</label>
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input type="checkbox" id="contrastToggle" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="contrastToggle" style={{ margin: 0, cursor: 'pointer' }}>High Contrast</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
