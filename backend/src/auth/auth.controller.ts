import { Controller, Post, Body, HttpCode, HttpStatus, Res, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Brute-force guard on the credential endpoints: 5 attempts / 60s per IP.
 *
 * Configurable ONLY so an automated suite can opt out of fighting it — the
 * full E2E run signs in as every seeded role back-to-back (6+ logins from
 * one IP inside a minute), which the strict limit correctly rejects with
 * 429, and no amount of test retrying can get around a working rate
 * limiter. The `.github/workflows/ci.yml` e2e job raises it; nothing else
 * sets these, so every other environment — including production — keeps
 * the strict 5/60s default below. Deliberately NOT wired to NODE_ENV: a
 * missing/typo'd var must fail safe (strict), never silently open.
 */
const AUTH_THROTTLE = {
  limit: Number(process.env.AUTH_THROTTLE_LIMIT) || 5,
  ttl: Number(process.env.AUTH_THROTTLE_TTL_MS) || 60000,
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: AUTH_THROTTLE })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(loginDto);
    
    // Set HttpOnly cookie
    res.cookie('infinity_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return data;
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
  getProfile(@CurrentUser() user: any) {
    return { user };
  }

  /**
   * Exit an impersonation session: if the current token was minted by the founder
   * console (`isImpersonated`), re-issue the founder's own session from
   * `impersonatorId` and swap the cookie back. No-op error otherwise.
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

