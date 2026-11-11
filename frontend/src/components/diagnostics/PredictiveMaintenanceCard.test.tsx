import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  PredictiveMaintenanceCard,
  PredictiveServiceItem,
} from './PredictiveMaintenanceCard';
import { GarageOfflineBuffer } from './offlineBuffer';

const mockItems: PredictiveServiceItem[] = [
  {
    key: 'OIL_AND_FILTER',
    name: 'Engine Oil & Filter Change',
    category: 'ENGINE',
    status: 'OVERDUE',
    urgency: 'HIGH',
    intervalKm: 10000,
    remainingKm: -2500,
    remainingDays: -20,
    estimatedDueDate: '2026-09-01',
    estimatedCostMad: 650,
    laymanAdvice: 'Crucial for engine longevity.',
  },
  {
    key: 'TIMING_BELT_KIT',
    name: 'Timing Belt Kit',
    category: 'POWERTRAIN',
    status: 'HEALTHY',
    urgency: 'LOW',
    intervalKm: 100000,
    remainingKm: 75000,
    remainingDays: 900,
    estimatedDueDate: '2028-01-01',
    estimatedCostMad: 2400,
    laymanAdvice: 'Critical to prevent snapping.',
  },
];

describe('PredictiveMaintenanceCard', () => {
  it('renders overall status and service items correctly', () => {
    render(
      <PredictiveMaintenanceCard
        vehicleName="Dacia Logan 2022"
        currentMileage={27500}
        overallStatus="CRITICAL_MAINTENANCE_DUE"
        items={mockItems}
      />,
    );

    expect(screen.getByText('Dacia Logan 2022 • Current Odometer: 27,500 km')).toBeDefined();
    expect(screen.getByText('CRITICAL MAINTENANCE DUE')).toBeDefined();
    expect(screen.getByText('Engine Oil & Filter Change')).toBeDefined();
    expect(screen.getByText('Timing Belt Kit')).toBeDefined();
    expect(screen.getByText('Exceeded by 2,500 km')).toBeDefined();
    expect(screen.getByText('75,000 km remaining')).toBeDefined();
  });

  it('filters items when filter tabs are clicked', () => {
    render(
      <PredictiveMaintenanceCard
        vehicleName="Dacia Logan 2022"
        currentMileage={27500}
        overallStatus="CRITICAL_MAINTENANCE_DUE"
        items={mockItems}
      />,
    );

    const overdueFilter = screen.getByRole('button', { name: /Overdue/i });
    fireEvent.click(overdueFilter);

    expect(screen.getByText('Engine Oil & Filter Change')).toBeDefined();
    expect(screen.queryByText('Timing Belt Kit')).toBeNull();
  });

  it('triggers onAddToWorkOrder when add button is clicked', () => {
    const handleAdd = vi.fn();
    render(
      <PredictiveMaintenanceCard
        vehicleName="Dacia Logan 2022"
        currentMileage={27500}
        overallStatus="CRITICAL_MAINTENANCE_DUE"
        items={mockItems}
        onAddToWorkOrder={handleAdd}
      />,
    );

    const addButton = screen.getByRole('button', { name: /\+ Add to Work Order Estimate/i });
    fireEvent.click(addButton);

    expect(handleAdd).toHaveBeenCalledWith(mockItems[0]);
  });
});

describe('GarageOfflineBuffer', () => {
  it('saves, retrieves, and clears diagnostic drafts safely in localStorage', () => {
    const vehicleId = 'veh-test-123';
    GarageOfflineBuffer.saveDraft(vehicleId, {
      symptoms: 'Check engine light on, rough idle at cold start',
      manualDtcCodes: ['P0300'],
    });

    const draft = GarageOfflineBuffer.getBufferedDraft(vehicleId);
    expect(draft).not.toBeNull();
    expect(draft?.symptoms).toContain('rough idle');
    expect(draft?.manualDtcCodes).toContain('P0300');
    expect(draft?.isPendingSync).toBe(true);

    GarageOfflineBuffer.clearDraft(vehicleId);
    expect(GarageOfflineBuffer.getBufferedDraft(vehicleId)).toBeNull();
  });

  it('enqueues and removes actions in the sync queue', () => {
    GarageOfflineBuffer.clearQueue();

    GarageOfflineBuffer.enqueueAction({
      type: 'SAVE_SYMPTOMS',
      payload: { symptoms: 'White smoke from exhaust' },
    });

    let queue = GarageOfflineBuffer.getSyncQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('SAVE_SYMPTOMS');

    GarageOfflineBuffer.removeAction(queue[0].id);
    queue = GarageOfflineBuffer.getSyncQueue();
    expect(queue.length).toBe(0);
  });
});
