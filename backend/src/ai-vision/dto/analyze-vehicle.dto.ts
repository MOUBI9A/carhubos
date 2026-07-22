import { IsUUID } from 'class-validator';

// Multipart form field (alongside the uploaded image) — FileInterceptor
// leaves non-file fields as strings on req.body, which the global
// ValidationPipe validates against this DTO exactly like a JSON body.
export class AnalyzeVehicleDto {
  @IsUUID(undefined, { message: 'carId must be a valid vehicle id' })
  carId: string;
}
