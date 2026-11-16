import { Controller, Post, Body, HttpCode, HttpStatus, Res, Get, Delete, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, VerifyEmailDto, ResendVerificationDto, DeleteAccountDto, PrivacyRequestDto } from './dto/auth.dto';
import type { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { AllowIncompleteOnboarding } from '../common/decorators/allow-incomplete-onboarding.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const configuredAuthThrottle = Number(process.env.AUTH_THROTTLE_LIMIT ?? 5);
const AUTH_THROTTLE_LIMIT =
  Number.isFinite(configuredAuthThrottle) && configuredAuthThrottle > 0
    ? configuredAuthThrottle
    : 5;

@AllowUnverified()
@AllowIncompleteOnboarding()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_THROTTLE_LIMIT, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(registerDto);

    // Set HttpOnly cookie for the session
    res.cookie('infinity_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return data;
  }

  @Throttle({ default: { limit: AUTH_THROTTLE_LIMIT, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(loginDto);
    
    res.cookie('infinity_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return data;
  }

  @Throttle({ default: { limit: AUTH_THROTTLE_LIMIT * 2, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.verifyEmail(dto.token);

    if (data.access_token) {
      res.cookie('infinity_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return data;
  }

  @Throttle({ default: { limit: AUTH_THROTTLE_LIMIT, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: Request,
  ) {
    const anyReq = req as any;
    let userId: string | undefined;
    if (anyReq.user?.id) {
      userId = anyReq.user.id;
    }

    return this.authService.resendVerification(dto, userId);
  }

  @UseGuards(AuthGuard)
  @Get('verification-status')
  getVerificationStatus(@CurrentUser() user: any) {
    return this.authService.getVerificationStatus(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('infinity_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    const fresh = await this.authService.getFreshProfile(user.id, user);
    return { user: fresh };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Post('exit-impersonation')
  async exitImpersonation(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!user?.isImpersonated || !user?.impersonatorId) {
      throw new BadRequestException('Not in an impersonation session.');
    }
    const data = await this.authService.issueSessionForUser(user.impersonatorId);
    res.cookie('infinity_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return data;
  }

  /** Non-destructive user-rights intake; never invokes account deletion. */
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('privacy-requests')
  requestPrivacyReview(
    @CurrentUser() user: { id: string },
    @Body() dto: PrivacyRequestDto,
  ) {
    return this.authService.submitPrivacyRequest(user.id, dto.type);
  }

  @UseGuards(AuthGuard)
  @Get('privacy-requests')
  listMyPrivacyRequests(@CurrentUser() user: { id: string }) {
    return this.authService.listMyPrivacyRequests(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Delete('me')
  async deleteAccount(
    @CurrentUser() user: any,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.deleteAccount(
      user.id,
      dto.password,
      dto.reason,
    );
    res.clearCookie('infinity_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return result;
  }
}
