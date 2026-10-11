export interface DamageDetection {
  type: string;
  location: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisionAnalysisResult {
  carId: string;
  timestamp: Date;
  integrityScore: number;
  detections: DamageDetection[];
  model: string;
  isSimulation: boolean;
  notice?: string;
  latencyMs?: number;
}

export interface VisionProvider {
  readonly name: string;
  readonly isSimulation: boolean;
  isAvailable(): boolean;
  analyzeImage(carId: string, imageBuffer: Buffer): Promise<VisionAnalysisResult>;
}
