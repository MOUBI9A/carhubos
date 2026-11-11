import { Injectable } from '@nestjs/common';
import { IPartsProvider } from './parts-provider.interface';
import { CrossReferenceResult, PartItem, VehicleFilter } from '../parts.types';

export const MOROCCO_PARTS_CATALOG: PartItem[] = [
  // --- IGNITION & MISFIRE (P0300, P0301, P0302...) ---
  {
    id: 'part-ign-01',
    partNumber: '0986221057',
    name: 'Ignition Coil Pack (Cylinder 1-4)',
    category: 'Ignition',
    brand: 'Bosch',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '04E905110K',
    crossReferences: ['04E905110K', '04E905110B', '48041', 'GN10401-12B1'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Direct OE replacement for VW/Seat/Skoda 1.2/1.4 TSI EA211 engines',
      'Engine codes: CJZA, CJZB, CMBA, CXSA, CZCA',
      'Verified physical fitment and resistance match',
    ],
    price: '480.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Autoplus Maroc (Casablanca Central)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0300', 'P0301', 'P0302', 'P0303', 'P0304'],
    applicableEngines: ['1.2 TSI', '1.4 TSI', '1.0 TSI'],
  },
  {
    id: 'part-ign-02',
    partNumber: '04E905110K',
    name: 'Original VAG Ignition Coil',
    category: 'Ignition',
    brand: 'Volkswagen Genuine Parts',
    tier: 'OEM_DIRECT',
    oemReference: '04E905110K',
    crossReferences: ['0986221057', '48041'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Factory original equipment matching VAG technical spec',
      'Exact factory ignition mapping and connector seal',
    ],
    price: '850.00',
    currency: 'MAD',
    availability: 'AVAILABLE_24H',
    supplier: 'Copart / VAG Maroc',
    warrantyMonths: 24,
    applicableDtcCodes: ['P0300', 'P0301', 'P0302', 'P0303', 'P0304'],
    applicableEngines: ['1.2 TSI', '1.4 TSI', '1.0 TSI'],
  },
  {
    id: 'part-ign-03',
    partNumber: 'ILZKR7B11',
    name: 'Laser Iridium Spark Plug',
    category: 'Ignition',
    brand: 'NGK',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '04E905601B',
    crossReferences: ['04E905601B', 'FR6HI332', '0241140512'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Pre-gapped 0.9mm laser welded iridium tip',
      'Thermal range 7 matches factory ECU spark advance',
    ],
    price: '160.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Maghreb Accessoires (Ain Sebaa)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0300', 'P0301'],
    applicableEngines: ['1.2 TSI', '1.4 TSI', '1.6 MPI'],
  },

  // --- DIESEL GLOW PLUGS (Dacia / Renault 1.5 dCi & VAG 1.6 TDI) ---
  {
    id: 'part-glow-01',
    partNumber: '0250403012',
    name: 'Duraterm High-Pressure Glow Plug (4.4V)',
    category: 'Ignition / Starting',
    brand: 'Bosch',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '03L963319',
    crossReferences: ['03L963319', 'CZ303', 'GE133'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Calibrated for 1.6 & 2.0 TDI Common Rail (CAYC, CRBC)',
      'Pre/Post heating cycle support to reduce cold-start particulate emissions',
    ],
    price: '190.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Autoplus Maroc (Rabat Agdal)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0380', 'P0670', 'P0671'],
    applicableEngines: ['1.6 TDI', '2.0 TDI'],
  },
  {
    id: 'part-glow-02',
    partNumber: '8200682592',
    name: 'Genuine Renault/Dacia Glow Plug (4.4V)',
    category: 'Ignition / Starting',
    brand: 'Renault Genuine Parts',
    tier: 'OEM_DIRECT',
    oemReference: '8200682592',
    crossReferences: ['0250403011', 'GN018', 'Y-732J'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Factory fitted to Dacia Logan, Sandero, Duster 1.5 dCi (K9K)',
      'Resistance 0.6 Ohm rated for Renault EDC17 injection computer',
    ],
    price: '240.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Somafaco Casablanca',
    warrantyMonths: 24,
    applicableDtcCodes: ['P0380', 'P0670'],
    applicableEngines: ['1.5 dCi'],
  },

  // --- AIR & LEAN SYSTEM (P0171, P0101) ---
  {
    id: 'part-maf-01',
    partNumber: '0281002917',
    name: 'Mass Air Flow Sensor (MAF)',
    category: 'Sensors',
    brand: 'Bosch',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '03L906461A',
    crossReferences: ['03L906461A', '5WK97023Z'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Precision hot-film anemometer with integrated intake air temp sensor',
      'Resolves P0101 plausibility and P0171 fuel trim drift on 1.6/2.0 TDI',
    ],
    price: '1150.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Autoplus Maroc (Casablanca Central)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0101', 'P0171'],
    applicableEngines: ['1.6 TDI', '2.0 TDI'],
  },
  {
    id: 'part-maf-02',
    partNumber: '8200651315',
    name: 'Air Flow Meter (Debimetre) 1.5 dCi',
    category: 'Sensors',
    brand: 'Continental / VDO',
    tier: 'OEM_DIRECT',
    oemReference: '8200651315',
    crossReferences: ['5WK97008Z', '7.07759.18.0'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'OEM supplier part for Renault/Dacia K9K Euro 5/6',
      'Matches factory calibration curve within 1.5% tolerance',
    ],
    price: '980.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Maghreb Accessoires (Ain Sebaa)',
    warrantyMonths: 24,
    applicableDtcCodes: ['P0101', 'P0171'],
    applicableEngines: ['1.5 dCi'],
  },

  // --- EXHAUST & OXYGEN SENSORS (P0130, P0420) ---
  {
    id: 'part-o2-01',
    partNumber: '0258017178',
    name: 'Upstream Broadband Oxygen / Lambda Sensor (LSU 4.9)',
    category: 'Sensors',
    brand: 'Bosch',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '04L906262B',
    crossReferences: ['04L906262B', '04L906262S'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Wideband planar 5-wire oxygen sensor with fast light-off heater',
      'Direct fix for P0130 circuit error and P0171 false lean reading',
    ],
    price: '1250.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Central Auto (Tanger Med)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0130', 'P0171', 'P0420'],
    applicableEngines: ['1.6 TDI', '2.0 TDI', '1.4 TSI'],
  },
  {
    id: 'part-cat-01',
    partNumber: '20938',
    name: 'Catalytic Converter with Integrated Front Pipe',
    category: 'Exhaust',
    brand: 'Walker Exhaust',
    tier: 'AFTERMARKET_STANDARD',
    oemReference: '1K0254511NX',
    crossReferences: ['1K0254511NX', 'BM91632H'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Euro 5 / Euro 6 compliant washcoat loading (Pt/Pd/Rh)',
      'Resolves P0420 catalyst efficiency below threshold code',
    ],
    price: '3400.00',
    currency: 'MAD',
    availability: 'AVAILABLE_24H',
    supplier: 'Somafaco Casablanca',
    warrantyMonths: 24,
    applicableDtcCodes: ['P0420'],
    applicableEngines: ['1.2 TSI', '1.4 TSI', '1.6 MPI'],
  },

  // --- COOLING & TEMPERATURE (P0118) ---
  {
    id: 'part-cool-01',
    partNumber: '32510',
    name: 'Engine Coolant Temperature Sensor (ECT with O-ring)',
    category: 'Sensors',
    brand: 'Febi Bilstein',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '06A919501A',
    crossReferences: ['06A919501A', '06A919501B', '6PT009107-541'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Dual NTC thermistor element (Gauge + ECU circuits)',
      'Resolves P0118 high voltage / open circuit fault and fan run-on',
    ],
    price: '130.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Autoplus Maroc (Casablanca Central)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0118', 'P0117'],
    applicableEngines: ['1.6 TDI', '2.0 TDI', '1.4 TSI', '1.6 MPI'],
  },
  {
    id: 'part-cool-02',
    partNumber: 'TH6874.83J',
    name: 'Thermostat Assembly with Housing & Sensor',
    category: 'Cooling',
    brand: 'Vernet / Calorstat',
    tier: 'AFTERMARKET_STANDARD',
    oemReference: '8200772985',
    crossReferences: ['8200772985', 'TI24783'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Opens at factory 83°C specification for Dacia 1.5 dCi',
      'Includes reinforced thermoplastic housing and sealing gasket',
    ],
    price: '320.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Maghreb Accessoires (Ain Sebaa)',
    warrantyMonths: 12,
    applicableDtcCodes: ['P0118', 'P0128'],
    applicableEngines: ['1.5 dCi'],
  },

  // --- BRAKING & WEAR ---
  {
    id: 'part-brake-01',
    partNumber: 'P85072',
    name: 'Front Brake Pads Set (with Wear Sensor)',
    category: 'Braking',
    brand: 'Brembo',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '1K0698151',
    crossReferences: ['1K0698151', 'GDB1550', '2358701'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'ECE R90 homologated ceramic-matrix friction compound',
      'Fits Golf VII, Leon 5F, Octavia III, Audi A3 (PR-1ZE/1ZP)',
    ],
    price: '420.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Autoplus Maroc (Casablanca Central)',
    warrantyMonths: 12,
    applicableEngines: ['1.6 TDI', '2.0 TDI', '1.4 TSI'],
  },
  {
    id: 'part-brake-02',
    partNumber: 'P68033',
    name: 'Front Brake Pads Set (Dacia Logan / Sandero / Duster)',
    category: 'Braking',
    brand: 'Brembo',
    tier: 'AFTERMARKET_PREMIUM',
    oemReference: '410602192R',
    crossReferences: ['410602192R', 'GDB1789', '2491401'],
    compatibilityConfidence: 'HIGH',
    compatibilityEvidence: [
      'Tested friction coefficient 0.42 mu for Dacia B0 chassis',
      'Zero asbestos, low dust formulation with anti-squeal shims',
    ],
    price: '280.00',
    currency: 'MAD',
    availability: 'IN_STOCK',
    supplier: 'Maghreb Accessoires (Ain Sebaa)',
    warrantyMonths: 12,
    applicableEngines: ['1.5 dCi', '1.0 TCe', '1.2 16V'],
  },
];

@Injectable()
export class MoroccoCatalogProvider implements IPartsProvider {
  async search(query: string, vehicle?: VehicleFilter): Promise<PartItem[]> {
    const q = query.trim().toLowerCase();
    return MOROCCO_PARTS_CATALOG.filter((p) => {
      // Query match on partNumber, name, category, brand, oemReference, or crossReferences
      const matchesQuery =
        !q ||
        p.partNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.oemReference.toLowerCase().includes(q) ||
        p.crossReferences.some((x) => x.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      // Filter by vehicle if specified
      if (vehicle?.engine) {
        const eng = vehicle.engine.toLowerCase();
        const matchesEngine = p.applicableEngines?.some((e) =>
          eng.includes(e.toLowerCase()) || e.toLowerCase().includes(eng),
        );
        if (!matchesEngine && p.applicableEngines?.length) {
          // If vehicle engine specified and doesn't match part engines, adjust confidence or filter
          return false;
        }
      }

      return true;
    });
  }

  async getRecommendationsForDtc(
    dtcCode: string,
    vehicle?: VehicleFilter,
  ): Promise<PartItem[]> {
    const code = dtcCode.trim().toUpperCase();
    return MOROCCO_PARTS_CATALOG.filter((p) => {
      const matchesDtc = p.applicableDtcCodes?.includes(code);
      if (!matchesDtc) return false;

      if (vehicle?.engine) {
        const eng = vehicle.engine.toLowerCase();
        const matchesEngine = p.applicableEngines?.some((e) =>
          eng.includes(e.toLowerCase()) || e.toLowerCase().includes(eng),
        );
        if (p.applicableEngines?.length && !matchesEngine) {
          return false;
        }
      }

      return true;
    });
  }

  async getCrossReferences(partOrOemNumber: string): Promise<CrossReferenceResult> {
    const num = partOrOemNumber.trim().toUpperCase();
    const matched = MOROCCO_PARTS_CATALOG.filter(
      (p) =>
        p.partNumber.toUpperCase() === num ||
        p.oemReference.toUpperCase() === num ||
        p.crossReferences.map((c) => c.toUpperCase()).includes(num),
    );

    const oem =
      matched.find((m) => m.tier === 'OEM_DIRECT')?.oemReference ??
      matched[0]?.oemReference ??
      num;

    return {
      query: partOrOemNumber,
      oemNumber: oem,
      parts: matched,
    };
  }
}
