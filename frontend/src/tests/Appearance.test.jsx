import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

const TestComponent = () => {
    const { 
        accentColor, setAccentColor, 
        density, setDensity,
        themeMode, setThemeMode,
        glassEffects, setGlassEffects
    } = useTheme();

    return (
        <div>
            <button onClick={() => setAccentColor('blue')}>Set Blue</button>
            <button onClick={() => setAccentColor('cyan')}>Set Cyan</button>
            <button onClick={() => setAccentColor('purple')}>Set Purple</button>

            <button onClick={() => setDensity('compact')}>Set Compact</button>
            <button onClick={() => setDensity('comfortable')}>Set Comfortable</button>

            <button onClick={() => setThemeMode('dark')}>Set Dark</button>
            <button onClick={() => setThemeMode('light')}>Set Light</button>

            <button onClick={() => setGlassEffects(true)}>Enable Glass</button>
            <button onClick={() => setGlassEffects(false)}>Disable Glass</button>
        </div>
    );
};

describe('Appearance Settings & ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-accent');
        document.documentElement.removeAttribute('data-density');
        document.documentElement.removeAttribute('data-glass');
    });

    it('loads default accent and density', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(document.documentElement.getAttribute('data-accent')).toBe('blue');
        expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
    });

    it('selecting Blue, Cyan, Purple changes global state', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        
        fireEvent.click(screen.getByText('Set Cyan'));
        expect(document.documentElement.getAttribute('data-accent')).toBe('cyan');
        expect(localStorage.getItem('accentColor')).toBe('cyan');

        fireEvent.click(screen.getByText('Set Purple'));
        expect(document.documentElement.getAttribute('data-accent')).toBe('purple');
        expect(localStorage.getItem('accentColor')).toBe('purple');

        fireEvent.click(screen.getByText('Set Blue'));
        expect(document.documentElement.getAttribute('data-accent')).toBe('blue');
        expect(localStorage.getItem('accentColor')).toBe('blue');
    });

    it('accent persists after reload', () => {
        localStorage.setItem('accentColor', 'purple');
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(document.documentElement.getAttribute('data-accent')).toBe('purple');
    });

    it('Compact and Comfortable changes density', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        
        fireEvent.click(screen.getByText('Set Compact'));
        expect(document.documentElement.getAttribute('data-density')).toBe('compact');
        expect(localStorage.getItem('density')).toBe('compact');

        fireEvent.click(screen.getByText('Set Comfortable'));
        expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
        expect(localStorage.getItem('density')).toBe('comfortable');
    });

    it('density persists after reload', () => {
        localStorage.setItem('density', 'compact');
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    });

    it('independence: changing one setting does not reset others', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        
        // Setup initial
        fireEvent.click(screen.getByText('Set Purple'));
        fireEvent.click(screen.getByText('Set Compact'));
        fireEvent.click(screen.getByText('Set Light'));
        fireEvent.click(screen.getByText('Disable Glass'));

        expect(document.documentElement.getAttribute('data-accent')).toBe('purple');
        expect(document.documentElement.getAttribute('data-density')).toBe('compact');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.getAttribute('data-glass')).toBe('false');

        // Change accent, verify others remain
        fireEvent.click(screen.getByText('Set Cyan'));
        expect(document.documentElement.getAttribute('data-accent')).toBe('cyan');
        expect(document.documentElement.getAttribute('data-density')).toBe('compact');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        // Change density, verify others remain
        fireEvent.click(screen.getByText('Set Comfortable'));
        expect(document.documentElement.getAttribute('data-accent')).toBe('cyan');
        expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        // Change theme, verify others remain
        fireEvent.click(screen.getByText('Set Dark'));
        expect(document.documentElement.getAttribute('data-accent')).toBe('cyan');
        expect(document.documentElement.getAttribute('data-density')).toBe('comfortable');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.getAttribute('data-glass')).toBe('false');
    });
});
