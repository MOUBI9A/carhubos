import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeControl() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

let store: Record<string, string> = {};
describe('ThemeProvider', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, val) => { store[key] = val; }),
        clear: vi.fn(() => { store = {}; }),
      },
      writable: true,
    });
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'fider');
  });

  afterEach(() => vi.restoreAllMocks());

  it('restores the saved theme and persists changes', () => {
    localStorage.setItem('carhub_theme', 'titan');
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    expect(document.documentElement).toHaveAttribute('data-theme', 'titan');
    fireEvent.click(screen.getByRole('button', { name: 'titan' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'fider');
    expect(localStorage.getItem('carhub_theme')).toBe('fider');
  });

  it('still applies the selected theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'fider' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'titan');
    expect(screen.getByRole('button', { name: 'titan' })).toBeInTheDocument();
  });

  it('falls back to Fider for an invalid stored theme', () => {
    localStorage.setItem('carhub_theme', 'unknown');
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    expect(document.documentElement).toHaveAttribute('data-theme', 'fider');
    expect(screen.getByRole('button', { name: 'fider' })).toBeInTheDocument();
  });
});
