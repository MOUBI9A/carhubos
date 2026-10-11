import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto';
import type { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { AllowIncompleteOnboarding } from '../common/decorators/allow-incomplete-onboarding.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@AllowUnverified()
@AllowIncompleteOnboarding()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(loginDto);

    // Set HttpOnly cookie
    res.cookie('infinity_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return data;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.verifyEmail(dto.token);

    // Set fresh cookie carrying verified status
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: Request,
  ) {
    // Current user id from cookie/bearer token if logged in
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

  /**
   * Exit an impersonation session
   */
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
}
