import { IsInt, Min } from 'class-validator';

/** No recipient or free-form message is accepted from the browser. */
export class GuardianWhatsAppNotificationDto {
  @IsInt()
  @Min(1)
  revision: number;
}
