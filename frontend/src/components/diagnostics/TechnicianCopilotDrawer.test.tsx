import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TechnicianCopilotDrawer } from './TechnicianCopilotDrawer';
import api from '@/lib/api';

vi.mock('@/lib/api');
vi.mock('@/lib/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('TechnicianCopilotDrawer', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <TechnicianCopilotDrawer isOpen={false} onClose={vi.fn()} activeDtcs={['P0300']} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and loads copilot synthesis for active DTCs when open', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        analyzedCodes: ['P0300', 'P0171'],
        primarySystem: 'POWERTRAIN',
        overallSeverity: 'MAJOR',
        rootCauseHypothesis: 'CORRELATED LEAN MISFIRE: Vacuum leak suspected.',
        correlatedFindings: ['Intake vacuum leak starving cylinders.'],
        prioritizedActionPlan: [
          {
            phase: 1,
            phaseName: 'Phase 1: Non-Invasive Screening',
            description: 'Check freeze frame and vacuum lines.',
            actionSteps: [
              {
                dtcCode: 'P0171',
                stepTitle: 'P0171 - Fuel Trim Check',
                procedure: 'Monitor STFT + LTFT in live OBD.',
                expectedValue: 'Total fuel trim between -5% and +5%',
                tool: 'OBD-II Scan Tool',
                type: 'SCAN_TOOL',
              },
            ],
          },
        ],
        estimatedTotalLaborHours: 2.2,
        requiredTools: ['OBD-II Scan Tool', 'Smoke Machine'],
        moroccanFieldAlerts: ['High summer heat dries out rubber intake boots in Marrakech.'],
        safetyWarnings: ['Hot exhaust caution.'],
      },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        code: 'P0300',
        standard: 'SAE_J2012',
        system: 'POWERTRAIN',
        subsystem: 'Ignition & Combustion',
        severity: 'MAJOR',
        title: 'Random / Multiple Cylinder Misfire Detected',
        definition: 'ECM detected multiple cylinder misfires.',
        component: 'Ignition Coils, Spark Plugs',
        probableCauses: ['Worn spark plugs', 'Vacuum leak'],
        symptoms: ['Flashing CEL', 'Engine shudder'],
        electricalTests: [],
        mechanicalTests: [],
        standardRepairProcedure: 'Smoke test intake.',
        estimatedLaborHours: 1.5,
        torqueSpecs: '28 Nm',
        specialTools: ['Smoke Machine'],
        moroccanOperatingContext: {
          climateRisk: 'Coil thermal breakdown.',
          fuelQualityFactor: 'Water in fuel.',
          fieldNotes: 'Check fuel filter first.',
        },
      },
    });

    render(
      <TechnicianCopilotDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeDtcs={['P0300', 'P0171']}
      />,
    );

    expect(screen.getByText(/Automotive Knowledge Graph & Technician Copilot/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/CORRELATED LEAN MISFIRE: Vacuum leak suspected/i)).toBeDefined();
    });

    expect(screen.getByText(/Phase 1: Non-Invasive Screening/i)).toBeDefined();
    expect(screen.getByText(/High summer heat dries out rubber intake boots in Marrakech/i)).toBeDefined();
    expect(screen.getByText(/Est. Labor: 2.2 hrs/i)).toBeDefined();
  });

  it('searches the knowledge base and displays matching DTCs', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        analyzedCodes: [],
        primarySystem: 'POWERTRAIN',
        overallSeverity: 'MODERATE',
        rootCauseHypothesis: 'No active codes.',
        correlatedFindings: [],
        prioritizedActionPlan: [],
        estimatedTotalLaborHours: 0,
        requiredTools: [],
        moroccanFieldAlerts: [],
        safetyWarnings: [],
      },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          code: 'P2463',
          system: 'POWERTRAIN',
          title: 'Diesel Particulate Filter - Soot Accumulation',
        },
      ],
    });

    render(
      <TechnicianCopilotDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeDtcs={[]}
      />,
    );

    const input = screen.getByPlaceholderText(/Search code/i);
    fireEvent.change(input, { target: { value: 'DPF' } });

    const searchBtn = screen.getByRole('button', { name: /^Search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('P2463')).toBeDefined();
      expect(screen.getByText(/Diesel Particulate Filter/i)).toBeDefined();
    });
  });
});
