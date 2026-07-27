import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import { CreateSubscriptionCheckoutDto } from './dto/checkout-subscription.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  /**
   * Agency owner starts an online checkout to upgrade their Fider plan →
   * returns the hosted redirect URL. Gated on billing.manage (OWNER-only).
   * MUST stay registered before `checkout/:invoiceId` below — Nest/Express
   * matches routes in declaration order, and `:invoiceId` would otherwise
   * swallow the literal segment `subscription` as a param value.
   */
  @Post('checkout/subscription')
  @UseGuards(AuthGuard, CapabilitiesGuard)
  @RequireCapabilities('billing.manage')
  createSubscriptionCheckout(
    @CurrentUser() user: any,
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.checkout.createSubscriptionCheckout(user.agencyId, dto);
  }

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
   * Signature verification (Stripe) needs the EXACT raw bytes, so we pass
   * req.rawBody (main.ts enables rawBody). MOCK has no signature and just
   * re-parses JSON, so the stringified parsed body is a fine fallback.
   */
  @Post('webhooks/:provider')
  @HttpCode(200)
  handleWebhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const raw = req.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(body ?? {});
    return this.checkout.handleWebhook(provider, raw, headers);
  }
}
