import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ROLE_PRESETS } from '../common/capabilities';
import { DEFAULT_PLAN_KEY, TRIAL_DAYS } from '../common/plans';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // agencyId is never accepted from the client; joining an existing agency
      // must go through a signed invite flow (out of scope). Public register can
      // only create a fresh agency (via agencyName) or a user with no agency.
      let agencyId: string | undefined;

      if (registerDto.agencyName) {
        const agency = await tx.agency.create({
          data: {
            name: registerDto.agencyName,
            contactEmail: registerDto.email,
            subscriptionTier: DEFAULT_PLAN_KEY,
          },
        });
        agencyId = agency.id;

        // SaaS lifecycle: put every new agency on the beta plan immediately, or
        // EntitlementsService would fall back to defaults and the billing page
        // would show nothing. Best-effort — if plans aren't seeded yet (fresh
        // DB), skip; entitlements fail open to BETA during the beta anyway.
        const betaPlan = await tx.plan.findUnique({
          where: { key: DEFAULT_PLAN_KEY },
        });
        if (betaPlan) {
          const now = new Date();
          await tx.subscription.create({
            data: {
              agencyId,
              planId: betaPlan.id,
              status: 'ACTIVE',
              trialEndsAt: new Date(
                now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
              ),
              currentPeriodStart: now,
              note: 'Auto-provisioned on signup (Fider beta).',
            },
          });
        }
      }

      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
          role:
            registerDto.role || (registerDto.agencyName ? 'OWNER' : 'AGENT'),
          agencyId: agencyId,
        },
      });

      // Capability engine: an agencyId here only ever comes from the fresh
      // agency created above, so the registrant is by construction its
      // founder/owner — seed the OWNER membership or every gated endpoint
      // would 403 them (CapabilitiesGuard requires a membership row). Users
      // registering without an agency get no membership.
      if (agencyId) {
        await tx.agencyMembership.create({
          data: {
            userId: user.id,
            agencyId,
            rolePreset: 'OWNER',
            capabilities: ROLE_PRESETS['OWNER'],
          },
        });
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
      };
      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
        },
      };
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // A soft-deleted agency's users can no longer operate. Fail closed with the
    // same generic message so we don't disclose the agency's deletion state.
    if (user.agencyId) {
      const agency = await this.prisma.agency.findFirst({
        where: { id: user.agencyId, deletedAt: null },
        select: { id: true },
      });
      if (!agency) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
      },
    };
  }
}
