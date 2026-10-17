import { PartItem, VehicleFilter, CrossReferenceResult } from '../parts.types';

export interface IPartsProvider {
  search(query: string, vehicle?: VehicleFilter): Promise<PartItem[]>;
  getRecommendationsForDtc(dtcCode: string, vehicle?: VehicleFilter): Promise<PartItem[]>;
  getCrossReferences(partOrOemNumber: string): Promise<CrossReferenceResult>;
}

export const PARTS_PROVIDER = 'PARTS_PROVIDER';
