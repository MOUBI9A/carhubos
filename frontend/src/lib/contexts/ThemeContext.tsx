"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'fider' | 'titan';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  themeConfig: {
    id: AppTheme;
    name: string;
    description: string;
    badge: string;
  };
}

const THEME_CONFIGS: Record<AppTheme, { id: AppTheme; name: string; description: string; badge: string }> = {
  fider: {
    id: 'fider',
    name: 'Fider Lux',
    description: 'Warm obsidian graphite, cream, & brushed brass luxury hospitality',
    badge: 'LUX',
  },
  titan: {
    id: 'titan',
    name: 'Titan Cyber',
    description: 'Cyberpunk deep navy, electric neon violet, & glassmorphic telemetry',
    badge: 'TITAN',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('fider');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('carhub_theme') as AppTheme | null;
      if (saved === 'titan' || saved === 'fider') {
        setThemeState(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-theme', 'fider');
      }
    } catch (e) {
      // Ignore localStorage access restrictions
    }
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('carhub_theme', nextTheme);
    } catch (e) {
      // Ignore
    }
  };

  const toggleTheme = () => {
    const next = theme === 'fider' ? 'titan' : 'fider';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        themeConfig: THEME_CONFIGS[theme],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
