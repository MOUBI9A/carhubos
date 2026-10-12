import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsIn(['IOS', 'ANDROID', 'WEB'])
  platform: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
