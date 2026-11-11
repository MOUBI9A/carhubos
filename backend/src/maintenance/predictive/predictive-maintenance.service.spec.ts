import { NotFoundException } from '@nestjs/common';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

describe('PredictiveMaintenanceService', () => {
  let service: PredictiveMaintenanceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      car: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      maintenanceRecord: {
        findMany: jest.fn(),
      },
      workOrder: {
        findMany: jest.fn(),
      },
    };
    service = new PredictiveMaintenanceService(mockPrisma);
  });

  describe('calculateScheduleForCar', () => {
    it('throws NotFoundException when car does not belong to agency', async () => {
      mockPrisma.car.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateScheduleForCar('agency-1', 'non-existent-car'),
      ).rejects.toThrow(NotFoundException);
    });

    it('flags overdue oil change when mileage exceeds interval without recent record', async () => {
      mockPrisma.car.findFirst.mockResolvedValue({
        id: 'car-1',
        agencyId: 'agency-1',
        make: 'Dacia',
        model: 'Logan',
        year: 2022,
        plateNumber: '12345-A-26',
        mileage: 25000,
      });

      // No past maintenance records
      mockPrisma.maintenanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const schedule = await service.calculateScheduleForCar('agency-1', 'car-1');

      expect(schedule.carId).toBe('car-1');
      expect(schedule.currentMileage).toBe(25000);
      expect(schedule.overdueCount).toBeGreaterThan(0);

      const oilItem = schedule.items.find((i) => i.key === 'OIL_AND_FILTER');
      expect(oilItem).toBeDefined();
      expect(oilItem?.status).toBe('OVERDUE');
      expect(oilItem?.remainingKm).toBeLessThanOrEqual(0);

      const timingBelt = schedule.items.find((i) => i.key === 'TIMING_BELT_KIT');
      expect(timingBelt).toBeDefined();
      expect(timingBelt?.status).toBe('HEALTHY');
      expect(timingBelt?.remainingKm).toBe(75000); // 100k - 25k

      expect(schedule.overallStatus).toBe('CRITICAL_MAINTENANCE_DUE');
    });

    it('marks service healthy when recently performed', async () => {
      mockPrisma.car.findFirst.mockResolvedValue({
        id: 'car-2',
        agencyId: 'agency-1',
        make: 'Renault',
        model: 'Clio 5',
        year: 2023,
        plateNumber: '67890-B-1',
        mileage: 20500,
      });

      // Recent oil change at 20,000 km (500 km ago)
      mockPrisma.maintenanceRecord.findMany.mockResolvedValue([
        {
          id: 'm-1',
          carId: 'car-2',
          type: 'VIDANGE',
          description: 'Vidange huile moteur 5W-30 + filtre',
          mileage: 20000,
          createdAt: new Date(),
        },
      ]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const schedule = await service.calculateScheduleForCar('agency-1', 'car-2');

      const oilItem = schedule.items.find((i) => i.key === 'OIL_AND_FILTER');
      expect(oilItem?.status).toBe('HEALTHY');
      expect(oilItem?.remainingKm).toBe(9500); // 10k - 500
      expect(oilItem?.lastServiceMileage).toBe(20000);
    });
  });

  describe('getFleetPredictiveOverview', () => {
    it('aggregates fleet statistics across all agency vehicles', async () => {
      mockPrisma.car.findMany.mockResolvedValue([
        { id: 'car-a', make: 'Dacia', model: 'Logan', plateNumber: '111', mileage: 5000 },
        { id: 'car-b', make: 'Peugeot', model: '208', plateNumber: '222', mileage: 35000 },
      ]);

      // Mock calculateScheduleForCar internally
      jest.spyOn(service, 'calculateScheduleForCar').mockImplementation(async (_agencyId, carId) => {
        if (carId === 'car-a') {
          return {
            carId: 'car-a',
            make: 'Dacia',
            brand: 'Dacia',
            model: 'Logan',
            licensePlate: '111',
            plateNumber: '111',
            currentMileage: 5000,
            estimatedMonthlyMileage: 1500,
            overallStatus: 'OPTIMAL',
            items: [],
            overdueCount: 0,
            dueSoonCount: 0,
            totalEstimatedPendingCostMad: 0,
          };
        }
        return {
          carId: 'car-b',
          make: 'Peugeot',
          brand: 'Peugeot',
          model: '208',
          licensePlate: '222',
          plateNumber: '222',
          currentMileage: 35000,
          estimatedMonthlyMileage: 1500,
          overallStatus: 'CRITICAL_MAINTENANCE_DUE',
          items: [
            {
              key: 'OIL_AND_FILTER',
              name: 'Engine Oil & Filter Change',
              nameFr: 'Vidange',
              nameAr: 'زيت',
              category: 'ENGINE',
              status: 'OVERDUE',
              urgency: 'HIGH',
              intervalKm: 10000,
              intervalMonths: 12,
              lastServiceMileage: 0,
              lastServiceDate: null,
              kmSinceLastService: 35000,
              remainingKm: -25000,
              remainingDays: -100,
              estimatedDueDate: '2026-01-01',
              estimatedCostMad: 650,
              laymanAdvice: 'Change oil',
            },
          ],
          overdueCount: 1,
          dueSoonCount: 0,
          totalEstimatedPendingCostMad: 650,
        };
      });

      const overview = await service.getFleetPredictiveOverview('agency-1');

      expect(overview.totalVehicles).toBe(2);
      expect(overview.healthyCount).toBe(1);
      expect(overview.criticalCount).toBe(1);
      expect(overview.projected30DayCostMad).toBe(650);
      expect(overview.vehiclesRequiringAttention.length).toBe(1);
      expect(overview.vehiclesRequiringAttention[0].carId).toBe('car-b');
    });
  });
});
