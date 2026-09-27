import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Read initial states from localStorage or use defaults
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue');
  const [density, setDensity] = useState(() => localStorage.getItem('density') || 'comfortable');
  const [glassEffects, setGlassEffects] = useState(() => localStorage.getItem('glassEffects') !== 'false');
  
  // Accessibility
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('reducedMotion') === 'true');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('highContrast') === 'true');

  const [actualTheme, setActualTheme] = useState('dark'); // Resolved theme if system

  useEffect(() => {
    const applyTheme = () => {
      let resolvedTheme = themeMode;
      if (themeMode === 'system') {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        resolvedTheme = prefersLight ? 'light' : 'dark';
      }
      setActualTheme(resolvedTheme);
      
      const root = document.documentElement;
      root.setAttribute('data-theme', resolvedTheme);
      root.setAttribute('data-accent', accentColor);
      root.setAttribute('data-density', density);
      root.setAttribute('data-reduced-motion', reducedMotion);
      root.setAttribute('data-high-contrast', highContrast);
      root.setAttribute('data-glass', glassEffects);
      
      // Save to localStorage
      localStorage.setItem('themeMode', themeMode);
      localStorage.setItem('accentColor', accentColor);
      localStorage.setItem('density', density);
      localStorage.setItem('reducedMotion', reducedMotion);
      localStorage.setItem('highContrast', highContrast);
      localStorage.setItem('glassEffects', glassEffects);
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode, accentColor, density, reducedMotion, highContrast, glassEffects]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{
      themeMode, setThemeMode,
      accentColor, setAccentColor,
      density, setDensity,
      reducedMotion, setReducedMotion,
      highContrast, setHighContrast,
      glassEffects, setGlassEffects,
      actualTheme, toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
