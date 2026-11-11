import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class VerifyWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  verificationNotes: string;

  @IsBoolean()
  dtcCleared: boolean;
}
