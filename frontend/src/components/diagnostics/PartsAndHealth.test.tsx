import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerVehicleHealthCard } from './CustomerVehicleHealthCard';
import { PartsCatalogMatcher } from './PartsCatalogMatcher';
import api from '@/lib/api';

vi.mock('@/lib/api');
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('CustomerVehicleHealthCard', () => {
  it('renders initial view health card button and fetches summary', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        overallRating: 'CRITICAL_ACTION_REQUIRED',
        canDrive: false,
        driveabilityAdvice: 'Do not drive long distances due to cylinder misfire.',
        urgency: 'IMMEDIATE',
        subsystems: [
          {
            systemKey: 'engine',
            name: 'Engine & Combustion',
            status: 'CRITICAL',
            laymanSummary: 'Cylinder 1 misfire recorded.',
            evidence: ['P0301'],
          },
        ],
        qAndA: {
          whatHappened: 'Cylinder 1 misfire detected.',
          whatNeedsRepair: 'Replace ignition coil and spark plug.',
          whatHappensIfIgnored: 'Catalytic converter failure.',
          estimatedRepairDuration: '1.5 hours',
          estimatedCostRangeMad: '450 - 1,200 MAD',
        },
        provenance: {
          dtcCodes: ['P0301'],
          dtcCount: 1,
          hasFreezeFrame: true,
          confidence: 'CONFIRMED_BY_TECHNICIAN',
          technicianConfirmed: true,
          timestamp: '2026-10-17T20:00:00Z',
        },
      },
    });

    render(<CustomerVehicleHealthCard sessionId="sess-1" canPerform={true} />);
    const btn = screen.getByRole('button', { name: /View Health Card/i });
    expect(btn).toBeDefined();

    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Do not drive long distances due to cylinder misfire/i)).toBeDefined();
    });

    expect(screen.getByText(/Catalytic converter failure/i)).toBeDefined();
    expect(screen.getByText(/450 - 1,200 MAD/i)).toBeDefined();
  });
});

describe('PartsCatalogMatcher', () => {
  it('searches parts and allows adding a part to estimate', async () => {
    const mockAddPart = vi.fn();
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 'part-ign-01',
          partNumber: '0986221057',
          name: 'Ignition Coil Pack',
          category: 'Ignition',
          brand: 'Bosch',
          tier: 'AFTERMARKET_PREMIUM',
          oemReference: '04E905110K',
          crossReferences: ['04E905110K'],
          compatibilityConfidence: 'HIGH',
          compatibilityEvidence: ['Direct OE replacement'],
          price: '480.00',
          currency: 'MAD',
          availability: 'IN_STOCK',
          supplier: 'Autoplus Maroc',
          warrantyMonths: 12,
        },
      ],
    });

    render(
      <PartsCatalogMatcher
        dtcCodes={['P0301']}
        vehicleBrand="Volkswagen"
        vehicleModel="Golf"
        onAddPart={mockAddPart}
      />,
    );

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Ignition Coil Pack')).toBeDefined();
    });

    expect(screen.getByText('480.00')).toBeDefined();
    expect(screen.getByText('Autoplus Maroc')).toBeDefined();

    const addBtn = screen.getByRole('button', { name: /Add to Estimate/i });
    fireEvent.click(addBtn);

    expect(mockAddPart).toHaveBeenCalledWith(
      expect.objectContaining({
        partNumber: '0986221057',
        price: '480.00',
      }),
    );
  });
});
