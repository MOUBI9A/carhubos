import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ALLOW_UNVERIFIED_KEY } from '../common/decorators/allow-unverified.decorator';
import { ALLOW_INCOMPLETE_ONBOARDING_KEY } from '../common/decorators/allow-incomplete-onboarding.decorator';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is not set. Refusing to verify tokens with a default secret.',
  );
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @Optional() private reflector?: Reflector,
    @Optional() private prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: JWT_SECRET,
      });
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers.
      // The JWT stores the user id in the standard `sub` claim — expose it
      // as `id` too, since controllers read @CurrentUser().id (e.g. as the
      // audit-log actorId, which is a required column).
      request['user'] = { ...payload, id: payload.sub };
    } catch {
      throw new UnauthorizedException();
    }

    const user = request['user'];

    // If no reflector is provided (e.g. legacy unit tests without Nest DI context), allow
    if (!this.reflector) {
      return true;
    }

    // Platform founder bypasses all agency-level email and onboarding gates
    if (user.role === 'ROOT_ADMIN') {
      return true;
    }

    // ── 1. EMAIL VERIFICATION GATE ──────────────────────────────────────────
    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowUnverified) {
      // Check verified state (JWT claim or DB fallback if session is older than verification)
      let isVerified = user.isVerified;

      if (!isVerified && this.prisma) {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { isVerified: true },
        });
        if (dbUser?.isVerified) {
          isVerified = true;
          user.isVerified = true;
        }
      }

      if (isVerified === false) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Email verification required. Please verify your email to access this resource.',
          code: 'EMAIL_VERIFICATION_REQUIRED',
        });
      }
    }

    // ── 2. MANDATORY OWNER ONBOARDING GATE ──────────────────────────────────
    // Applies strictly to OWNER role who has an agency registered.
    // Employees, renters, and admins are never locked in owner onboarding.
    if (user.role === 'OWNER' && user.agencyId) {
      const allowIncomplete = this.reflector.getAllAndOverride<boolean>(
        ALLOW_INCOMPLETE_ONBOARDING_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!allowIncomplete) {
        let onboardingStatus = user.onboardingStatus;
        let currentStep = user.onboardingCurrentStep || 1;

        if (this.prisma) {
          const agency = await this.prisma.agency.findUnique({
            where: { id: user.agencyId },
            select: { onboardingStatus: true, onboardingCurrentStep: true },
          });
          if (agency) {
            onboardingStatus = agency.onboardingStatus;
            currentStep = agency.onboardingCurrentStep;
          }
        }

        if (onboardingStatus && onboardingStatus !== 'COMPLETED') {
          throw new ForbiddenException({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Agency onboarding incomplete. Please finish onboarding to access product features.',
            code: 'ONBOARDING_INCOMPLETE',
            onboardingCurrentStep: currentStep,
          });
        }
      }
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    if (request.cookies && request.cookies['infinity_token']) {
      return request.cookies['infinity_token'];
    }
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
