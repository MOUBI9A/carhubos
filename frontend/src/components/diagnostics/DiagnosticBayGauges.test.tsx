import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagnosticBayGauges } from './DiagnosticBayGauges';

describe('DiagnosticBayGauges', () => {
  it('renders gauges with standby status and controls', () => {
    render(<DiagnosticBayGauges sessionId="sess-1" canPerform={true} />);

    expect(screen.getByText(/Diagnostic Bay Live Telemetry Stream/i)).toBeDefined();
    expect(screen.getByText(/Engine Tachometer/i)).toBeDefined();
    expect(screen.getByText(/Vehicle Speed/i)).toBeDefined();
    expect(screen.getByText(/Engine Coolant/i)).toBeDefined();
    expect(screen.getByText(/Fuel Trims & Combustion Load/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Start Live Stream/i })).toBeDefined();
  });

  it('disables start stream button when canPerform is false', () => {
    render(<DiagnosticBayGauges sessionId="sess-1" canPerform={false} />);
    const startBtn = screen.getByRole('button', { name: /Start Live Stream/i });
    expect(startBtn.hasAttribute('disabled')).toBe(true);
  });
});
