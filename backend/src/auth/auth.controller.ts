import { Controller, Post, Body, HttpCode, HttpStatus, Res, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

