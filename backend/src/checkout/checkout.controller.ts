import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  /**
   * Agency starts an online checkout for a booking invoice → returns the hosted
   * redirect URL to send the customer to. Gated on payment.record (staff who can
   * take a payment can raise a payment link); agencyId comes from the JWT, so a
   * cross-tenant invoiceId 404s.
   */
  @Post('checkout/:invoiceId')
  @UseGuards(AuthGuard, CapabilitiesGuard)
  @RequireCapabilities('payment.record')
  createCheckout(
    @CurrentUser() user: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.checkout.createCheckout(user.agencyId, invoiceId, dto);
  }

  /**
   * Gateway webhook — PUBLIC (the gateway is the caller; no session cookie). The
   * gateway adapter authenticates it (signature) and only the configured
   * provider is accepted. Always 200 so the gateway doesn't retry-storm on a
   * duplicate we've already settled (settlement is idempotent).
   *
   * NOTE: main.ts has no rawBody, so the parsed JSON body is re-stringified here.
   * That's fine for MOCK; a real Stripe adapter needs the raw bytes for
   * signature verification — enable `rawBody` on NestFactory.create and read
   * req.rawBody (documented in stripe.gateway.ts).
   */
  @Post('webhooks/:provider')
  @HttpCode(200)
  handleWebhook(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.checkout.handleWebhook(
      provider,
      JSON.stringify(body ?? {}),
      headers,
    );
  }
}
