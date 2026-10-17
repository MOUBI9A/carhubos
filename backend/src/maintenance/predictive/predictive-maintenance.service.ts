import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EvaluatedServiceItem,
  FleetPredictiveOverview,
  MaintenanceIntervalDefinition,
  STANDARD_MAINTENANCE_INTERVALS,
  VehicleMaintenanceSchedule,
} from './predictive-maintenance.types';

@Injectable()
export class PredictiveMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates the predictive maintenance status and upcoming service schedule for a specific vehicle.
   */
  async calculateScheduleForCar(
    agencyId: string,
    carId: string,
  ): Promise<VehicleMaintenanceSchedule> {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, agencyId },
    });

    if (!car) {
      throw new NotFoundException(`Car with ID ${carId} not found in this agency`);
    }

    // Retrieve all historical maintenance records for this car
    const records = await this.prisma.maintenanceRecord.findMany({
      where: { carId: car.id },
      orderBy: [{ mileage: 'desc' }, { createdAt: 'desc' }],
    });

    // Also inspect completed work orders for this car
    const completedWorkOrders = await this.prisma.workOrder.findMany({
      where: {
        fleetCarId: car.id,
        agencyId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    const currentMileage = car.mileage || 0;
    const now = new Date();

    // Estimate monthly mileage based on average (approx 1,500 km/month for commercial/rental fleets in Morocco)
    const estimatedMonthlyMileage = 1500;
    const estimatedDailyMileage = estimatedMonthlyMileage / 30;

    const evaluatedItems: EvaluatedServiceItem[] = STANDARD_MAINTENANCE_INTERVALS.map((def) => {
      return this.evaluateItem(def, records, completedWorkOrders, currentMileage, now, estimatedDailyMileage);
    });

    // Count categories
    const overdueCount = evaluatedItems.filter((i) => i.status === 'OVERDUE').length;
    const dueSoonCount = evaluatedItems.filter((i) => i.status === 'DUE_SOON').length;

    // Calculate total pending cost for overdue and due-soon items
    const totalEstimatedPendingCostMad = evaluatedItems
      .filter((i) => i.status === 'OVERDUE' || i.status === 'DUE_SOON')
      .reduce((sum, item) => sum + item.estimatedCostMad, 0);

    let overallStatus: VehicleMaintenanceSchedule['overallStatus'] = 'OPTIMAL';
    if (overdueCount > 0) {
      const hasCriticalOverdue = evaluatedItems.some(
        (i) => i.status === 'OVERDUE' && (i.urgency === 'IMMEDIATE' || i.urgency === 'HIGH'),
      );
      overallStatus = hasCriticalOverdue || overdueCount >= 2 ? 'CRITICAL_MAINTENANCE_DUE' : 'ATTENTION_REQUIRED';
    } else if (dueSoonCount > 0) {
      overallStatus = 'ATTENTION_REQUIRED';
    }

    return {
      carId: car.id,
      make: car.brand,
      brand: car.brand,
      model: car.model,
      year: car.year,
      licensePlate: car.licensePlate,
      plateNumber: car.licensePlate,
      currentMileage,
      estimatedMonthlyMileage,
      overallStatus,
      items: evaluatedItems,
      overdueCount,
      dueSoonCount,
      totalEstimatedPendingCostMad,
    };
  }

  /**
   * Aggregates fleet-wide predictive maintenance status across all agency vehicles.
   */
  async getFleetPredictiveOverview(agencyId: string): Promise<FleetPredictiveOverview> {
    const cars = await this.prisma.car.findMany({
      where: { agencyId },
      select: { id: true, brand: true, model: true, licensePlate: true, mileage: true },
    });

    let healthyCount = 0;
    let attentionCount = 0;
    let criticalCount = 0;
    let projected30DayCostMad = 0;
    let urgentItemsCount = 0;

    const vehiclesRequiringAttention: FleetPredictiveOverview['vehiclesRequiringAttention'] = [];

    for (const car of cars) {
      const schedule = await this.calculateScheduleForCar(agencyId, car.id);

      if (schedule.overallStatus === 'OPTIMAL') {
        healthyCount++;
      } else if (schedule.overallStatus === 'ATTENTION_REQUIRED') {
        attentionCount++;
      } else {
        criticalCount++;
      }

      const overdueItems = schedule.items.filter((i) => i.status === 'OVERDUE');
      const dueSoonItems = schedule.items.filter((i) => i.status === 'DUE_SOON');

      if (overdueItems.length > 0 || dueSoonItems.length > 0) {
        projected30DayCostMad += schedule.totalEstimatedPendingCostMad;
        urgentItemsCount += overdueItems.length;

        vehiclesRequiringAttention.push({
          carId: car.id,
          make: car.brand,
          brand: car.brand,
          model: car.model,
          licensePlate: car.licensePlate,
          plateNumber: car.licensePlate,
          currentMileage: car.mileage || 0,
          overdueItems: overdueItems.map((i) => i.name),
          dueSoonItems: dueSoonItems.map((i) => i.name),
          immediateCostMad: schedule.totalEstimatedPendingCostMad,
        });
      }
    }

    return {
      totalVehicles: cars.length,
      healthyCount,
      attentionCount,
      criticalCount,
      projected30DayCostMad,
      urgentItemsCount,
      vehiclesRequiringAttention,
    };
  }

  private evaluateItem(
    def: MaintenanceIntervalDefinition,
    records: any[],
    workOrders: any[],
    currentMileage: number,
    now: Date,
    estimatedDailyMileage: number,
  ): EvaluatedServiceItem {
    // Look for matching maintenance record or completed work order
    const match = this.findLastServiceRecord(def.key, records, workOrders);

    let lastServiceMileage = 0;
    let lastServiceDate: string | null = null;
    let daysSinceLastService = 120; // Default fallback: approx 4 months if unrecorded

    if (match) {
      lastServiceMileage = match.mileage || 0;
      lastServiceDate = match.date.toISOString();
      const diffMs = Math.max(0, now.getTime() - match.date.getTime());
      daysSinceLastService = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const kmSinceLastService = Math.max(0, currentMileage - lastServiceMileage);
    const remainingKm = def.intervalKm - kmSinceLastService;

    // Remaining days based on calendar interval or driving rate
    const maxIntervalDays = def.intervalMonths * 30;
    const calendarRemainingDays = maxIntervalDays - daysSinceLastService;
    const mileageRemainingDays = Math.floor(remainingKm / (estimatedDailyMileage || 50));

    // Remaining days is the tighter constraint of mileage vs time
    const remainingDays = Math.min(calendarRemainingDays, mileageRemainingDays);

    let status: EvaluatedServiceItem['status'] = 'HEALTHY';
    let urgency: EvaluatedServiceItem['urgency'] = 'LOW';

    if (remainingKm <= 0 || calendarRemainingDays <= 0) {
      status = 'OVERDUE';
      urgency = def.urgencyIfOverdue;
    } else if (remainingKm <= 1500 || remainingDays <= 30) {
      status = 'DUE_SOON';
      urgency = def.urgencyIfOverdue === 'IMMEDIATE' ? 'HIGH' : 'MEDIUM';
    } else if (remainingKm <= 5000 || remainingDays <= 90) {
      status = 'UPCOMING';
      urgency = 'LOW';
    } else {
      status = 'HEALTHY';
      urgency = 'LOW';
    }

    // Estimated due date
    const dueDate = new Date(now.getTime() + Math.max(0, remainingDays) * 24 * 60 * 60 * 1000);
    const estimatedDueDate = dueDate.toISOString().split('T')[0];

    return {
      key: def.key,
      name: def.name,
      nameFr: def.nameFr,
      nameAr: def.nameAr,
      category: def.category,
      status,
      urgency,
      intervalKm: def.intervalKm,
      intervalMonths: def.intervalMonths,
      lastServiceMileage,
      lastServiceDate,
      kmSinceLastService,
      remainingKm,
      remainingDays,
      estimatedDueDate,
      estimatedCostMad: def.estimatedCostMad,
      laymanAdvice: def.laymanAdvice,
    };
  }

  private findLastServiceRecord(
    key: string,
    records: any[],
    workOrders: any[],
  ): { mileage: number; date: Date } | null {
    const keywords = this.getKeywordPatterns(key);

    // Check MaintenanceRecords first
    for (const rec of records) {
      const desc = (rec.description || '').toLowerCase();
      const type = (rec.type || '').toUpperCase();

      if (key === 'OIL_AND_FILTER' && type === 'VIDANGE') {
        return { mileage: rec.mileage || 0, date: new Date(rec.createdAt) };
      }

      if (key === 'FRONT_BRAKE_PADS' && type === 'BRAKES') {
        return { mileage: rec.mileage || 0, date: new Date(rec.createdAt) };
      }

      for (const kw of keywords) {
        if (desc.includes(kw)) {
          return { mileage: rec.mileage || 0, date: new Date(rec.createdAt) };
        }
      }
    }

    // Check WorkOrders line items and descriptions
    for (const wo of workOrders) {
      const desc = (wo.description || '').toLowerCase();
      const lineItems = Array.isArray(wo.lineItems) ? wo.lineItems : [];

      for (const kw of keywords) {
        if (desc.includes(kw)) {
          return { mileage: 0, date: new Date(wo.completedAt || wo.createdAt) };
        }

        const matchLine = lineItems.some((item: any) =>
          (item.description || '').toLowerCase().includes(kw),
        );
        if (matchLine) {
          return { mileage: 0, date: new Date(wo.completedAt || wo.createdAt) };
        }
      }
    }

    return null;
  }

  private getKeywordPatterns(key: string): string[] {
    switch (key) {
      case 'OIL_AND_FILTER':
        return ['vidange', 'huile moteur', 'oil filter', 'engine oil'];
      case 'AIR_FILTER':
        return ['filtre à air', 'filtre a air', 'air filter'];
      case 'CABIN_FILTER':
        return ['habitacle', 'cabin filter', 'pollen'];
      case 'FUEL_FILTER':
        return ['filtre à carburant', 'filtre gazole', 'fuel filter', 'gasoil'];
      case 'FRONT_BRAKE_PADS':
        return ['plaquettes avant', 'frein avant', 'front brake'];
      case 'REAR_BRAKE_PADS':
        return ['plaquettes arrière', 'plaquettes arriere', 'frein arrière', 'rear brake'];
      case 'BRAKE_FLUID':
        return ['liquide de frein', 'purge frein', 'brake fluid', 'dot 4'];
      case 'SPARK_PLUGS':
        return ['bougies', 'bougie', 'spark plug'];
      case 'COOLANT_FLUSH':
        return ['refroidissement', 'liquide refroidissement', 'coolant flush'];
      case 'TIMING_BELT_KIT':
        return ['distribution', 'courroie', 'timing belt'];
      default:
        return [];
    }
  }
}
