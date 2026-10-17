export type MaintenanceUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
export type MaintenanceStatus = 'HEALTHY' | 'UPCOMING' | 'DUE_SOON' | 'OVERDUE';
export type MaintenanceCategory = 'ENGINE' | 'FILTRATION' | 'BRAKING' | 'FLUIDS' | 'POWERTRAIN';

export interface MaintenanceIntervalDefinition {
  key: string;
  name: string;
  nameFr: string;
  nameAr: string;
  category: MaintenanceCategory;
  intervalKm: number;
  intervalMonths: number;
  typicalLaborMinutes: number;
  estimatedCostMad: number;
  urgencyIfOverdue: MaintenanceUrgency;
  description: string;
  laymanAdvice: string;
}

export interface EvaluatedServiceItem {
  key: string;
  name: string;
  nameFr: string;
  nameAr: string;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  urgency: MaintenanceUrgency;
  intervalKm: number;
  intervalMonths: number;
  lastServiceMileage: number;
  lastServiceDate: string | null;
  kmSinceLastService: number;
  remainingKm: number;
  remainingDays: number;
  estimatedDueDate: string;
  estimatedCostMad: number;
  laymanAdvice: string;
}

export interface VehicleMaintenanceSchedule {
  carId: string;
  make: string;
  brand: string;
  model: string;
  year?: number;
  licensePlate: string;
  plateNumber: string;
  currentMileage: number;
  estimatedMonthlyMileage: number;
  overallStatus: 'OPTIMAL' | 'ATTENTION_REQUIRED' | 'CRITICAL_MAINTENANCE_DUE';
  items: EvaluatedServiceItem[];
  overdueCount: number;
  dueSoonCount: number;
  totalEstimatedPendingCostMad: number;
}

export interface FleetPredictiveOverview {
  totalVehicles: number;
  healthyCount: number;
  attentionCount: number;
  criticalCount: number;
  projected30DayCostMad: number;
  urgentItemsCount: number;
  vehiclesRequiringAttention: Array<{
    carId: string;
    make: string;
    brand: string;
    model: string;
    licensePlate: string;
    plateNumber: string;
    currentMileage: number;
    overdueItems: string[];
    dueSoonItems: string[];
    immediateCostMad: number;
  }>;
}

/**
 * Standard automotive maintenance intervals tailored for Moroccan driving conditions
 * (dust, temperature variations, urban start-stop vs highway).
 */
export const STANDARD_MAINTENANCE_INTERVALS: MaintenanceIntervalDefinition[] = [
  {
    key: 'OIL_AND_FILTER',
    name: 'Engine Oil & Filter Change',
    nameFr: 'Vidange huile moteur & filtre à huile',
    nameAr: 'تغيير زيت المحرك وفلتر الزيت',
    category: 'ENGINE',
    intervalKm: 10000,
    intervalMonths: 12,
    typicalLaborMinutes: 45,
    estimatedCostMad: 650,
    urgencyIfOverdue: 'HIGH',
    description: 'Synthetic engine oil (5W-30 / 5W-40) replacement with OEM quality filter.',
    laymanAdvice: 'Crucial for engine longevity. Old oil loses lubrication and causes engine friction.',
  },
  {
    key: 'AIR_FILTER',
    name: 'Engine Air Filter',
    nameFr: "Filtre à air moteur",
    nameAr: 'فلتر هواء المحرك',
    category: 'FILTRATION',
    intervalKm: 20000,
    intervalMonths: 12,
    typicalLaborMinutes: 20,
    estimatedCostMad: 180,
    urgencyIfOverdue: 'MEDIUM',
    description: 'Engine intake air filtration element replacement.',
    laymanAdvice: 'A clogged air filter restricts airflow, increasing fuel consumption and reducing engine power.',
  },
  {
    key: 'CABIN_FILTER',
    name: 'Cabin Pollen Filter',
    nameFr: "Filtre d'habitacle / pollen",
    nameAr: 'فلتر مكيف الهواء والمقصورة',
    category: 'FILTRATION',
    intervalKm: 20000,
    intervalMonths: 12,
    typicalLaborMinutes: 25,
    estimatedCostMad: 150,
    urgencyIfOverdue: 'LOW',
    description: 'Active carbon interior HVAC cabin filter replacement.',
    laymanAdvice: 'Prevents dust, allergens, and odors from entering the passenger cabin.',
  },
  {
    key: 'FUEL_FILTER',
    name: 'Fuel Filter (Diesel / Petrol)',
    nameFr: 'Filtre à carburant (Gazole / Essence)',
    nameAr: 'فلتر الوقود (مازوت / بنزين)',
    category: 'FILTRATION',
    intervalKm: 30000,
    intervalMonths: 24,
    typicalLaborMinutes: 45,
    estimatedCostMad: 320,
    urgencyIfOverdue: 'HIGH',
    description: 'Fuel particulate and water separator filter replacement.',
    laymanAdvice: 'Protects high-pressure injectors from diesel contaminants and water deposits.',
  },
  {
    key: 'FRONT_BRAKE_PADS',
    name: 'Front Brake Pads',
    nameFr: 'Plaquettes de frein avant',
    nameAr: 'فحمات الفرامل الأمامية',
    category: 'BRAKING',
    intervalKm: 30000,
    intervalMonths: 24,
    typicalLaborMinutes: 60,
    estimatedCostMad: 580,
    urgencyIfOverdue: 'IMMEDIATE',
    description: 'Front axle friction pads replacement with wear sensor inspection.',
    laymanAdvice: 'Critical safety component. Worn pads increase stopping distance and damage brake rotors.',
  },
  {
    key: 'REAR_BRAKE_PADS',
    name: 'Rear Brake Pads / Shoes',
    nameFr: 'Plaquettes de frein arrière',
    nameAr: 'فحمات الفرامل الخلفية',
    category: 'BRAKING',
    intervalKm: 45000,
    intervalMonths: 36,
    typicalLaborMinutes: 60,
    estimatedCostMad: 490,
    urgencyIfOverdue: 'HIGH',
    description: 'Rear axle brake pads or drum shoes replacement.',
    laymanAdvice: 'Essential for balanced vehicle deceleration and electronic parking brake operation.',
  },
  {
    key: 'BRAKE_FLUID',
    name: 'Brake Fluid Flush (DOT 4)',
    nameFr: 'Purge liquide de frein (DOT 4)',
    nameAr: 'تغيير سائل الفرامل',
    category: 'FLUIDS',
    intervalKm: 40000,
    intervalMonths: 24,
    typicalLaborMinutes: 45,
    estimatedCostMad: 250,
    urgencyIfOverdue: 'HIGH',
    description: 'Complete brake hydraulic fluid flush and air bleed.',
    laymanAdvice: 'Brake fluid absorbs moisture over time, lowering boiling point and causing spongy pedal feel.',
  },
  {
    key: 'SPARK_PLUGS',
    name: 'Spark Plugs (Gasoline engines)',
    nameFr: "Bougies d'allumage",
    nameAr: 'شمعات الإشعال (بواجي)',
    category: 'ENGINE',
    intervalKm: 60000,
    intervalMonths: 48,
    typicalLaborMinutes: 45,
    estimatedCostMad: 420,
    urgencyIfOverdue: 'MEDIUM',
    description: 'Iridium / platinum spark plugs set replacement.',
    laymanAdvice: 'Worn spark plugs cause engine misfires, rough idle, and poor fuel efficiency.',
  },
  {
    key: 'COOLANT_FLUSH',
    name: 'Engine Coolant Flush',
    nameFr: 'Remplacement liquide de refroidissement',
    nameAr: 'تغيير سائل تبريد المحرك',
    category: 'FLUIDS',
    intervalKm: 60000,
    intervalMonths: 48,
    typicalLaborMinutes: 60,
    estimatedCostMad: 350,
    urgencyIfOverdue: 'HIGH',
    description: 'Antifreeze / anti-boil corrosion inhibitor flush and refill.',
    laymanAdvice: 'Prevents engine overheating, corrosion, and head gasket failure in Moroccan summer temperatures.',
  },
  {
    key: 'TIMING_BELT_KIT',
    name: 'Timing Belt Kit & Water Pump',
    nameFr: 'Kit courroie de distribution & pompe à eau',
    nameAr: 'طقم حزام التوقيت ومضخة الماء',
    category: 'POWERTRAIN',
    intervalKm: 100000,
    intervalMonths: 60,
    typicalLaborMinutes: 180,
    estimatedCostMad: 2400,
    urgencyIfOverdue: 'IMMEDIATE',
    description: 'Complete timing belt, tensioner pulleys, and water pump replacement.',
    laymanAdvice: 'Catastrophic failure risk if neglected: snapping timing belt causes severe internal engine destruction.',
  },
];
