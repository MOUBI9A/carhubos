import { IsNotEmpty, IsString } from 'class-validator';

export class BlacklistCustomerDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
