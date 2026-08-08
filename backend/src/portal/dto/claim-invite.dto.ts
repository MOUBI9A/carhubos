import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
