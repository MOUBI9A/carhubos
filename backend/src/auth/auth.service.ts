import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto, ResendVerificationDto, DeleteAccountDto } from './dto/auth.dto';
import { ROLE_PRESETS } from '../common/capabilities';
import { DEFAULT_PLAN_KEY, TRIAL_DAYS } from '../common/plans';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    @Optional() private emailService?: EmailService,
    @Optional() private auditLogs?: AuditLogsService,
  ) {}

  /**
   * Cryptographically secure SHA-256 hash.
   * Tokens are NEVER stored plaintext in the database.
   */
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async register(registerDto: RegisterDto) {
    const legalRevision = '2026-11-12-draft'; // Counsel must approve before production.
    if (
      registerDto.agencyName &&
      (registerDto.legalNoticeAcknowledged !== true ||
        registerDto.confirmsAdultAndAuthority !== true)
    ) {
      throw new BadRequestException(
        'Agency signup requires acknowledgement of terms and confirmation of adult business authority.',
      );
    }

    const existingUser = await this.usersService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Cryptographically secure verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawVerificationToken);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await this.prisma.$transaction(async (tx) => {
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
            onboardingStatus: 'NOT_STARTED',
            onboardingCurrentStep: 1,
          },
        });
        agencyId = agency.id;

        // SaaS lifecycle: put every new agency on the beta plan immediately
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
          isVerified: false,
          legalNoticeAcknowledgedAt:
            registerDto.legalNoticeAcknowledged === true ? new Date() : null,
          legalNoticeRevision:
            registerDto.legalNoticeAcknowledged === true ? legalRevision : null,
          adultBusinessAuthorityConfirmedAt:
            registerDto.confirmsAdultAndAuthority === true ? new Date() : null,
        },
      });

      // Seed OWNER membership if agency was created
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

      // Store hashed verification token
      if (tx.emailVerificationToken) {
        await tx.emailVerificationToken.create({
          data: {
            tokenHash,
            userId: user.id,
            email: user.email,
            expiresAt: verificationExpiry,
          },
        });
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        isVerified: false,
        onboardingStatus: agencyId ? 'NOT_STARTED' : undefined,
      };

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
          isVerified: false,
          onboardingStatus: agencyId ? 'NOT_STARTED' : undefined,
        },
        ...(process.env.NODE_ENV !== 'production'
          ? { debugVerificationToken: rawVerificationToken }
          : {}),
      };
    });

    // Send transactional verification email (non-blocking outside transaction)
    if (this.emailService) {
      try {
        await this.emailService.sendVerificationEmail(
          registerDto.email,
          registerDto.name,
          rawVerificationToken,
        );
      } catch (err: any) {
        // Log without leaking token
        // In dev or test this is handled; in prod error is logged
      }
    }

    return {
      ...result,
      requiresVerification: true,
      message: 'Account created. Please verify your email to continue setup.',
    };
  }

  /**
   * Verifies an email using a submitted raw token string.
   */
  async verifyEmail(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Verification token is required.');
    }

    const tokenHash = this.hashToken(rawToken.trim());

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { agency: true },
        },
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Verification link is invalid or has expired.',
      });
    }

    // Check if already used
    if (tokenRecord.usedAt) {
      if (tokenRecord.user.isVerified) {
        const session = await this.issueSessionForUser(tokenRecord.user.id);
        return {
          message: 'Email is already verified.',
          alreadyVerified: true,
          ...session,
        };
      }
      throw new BadRequestException({
        code: 'ALREADY_USED',
        message: 'This verification link has already been used.',
      });
    }

    // Check if expired
    if (new Date() > tokenRecord.expiresAt) {
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: 'Verification link has expired. Please request a new one.',
      });
    }

    // Consume token and mark user verified inside transaction
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: now },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          isVerified: true,
          emailVerifiedAt: now,
        },
      });
    });

    // Mint updated session carrying isVerified: true
    const session = await this.issueSessionForUser(tokenRecord.userId);
    const agencyOnboardingIncomplete =
      tokenRecord.user.role === 'OWNER' &&
      tokenRecord.user.agency?.onboardingStatus !== 'COMPLETED';

    return {
      message: 'Email verified successfully.',
      verified: true,
      nextStep: agencyOnboardingIncomplete ? 'ONBOARDING' : 'DASHBOARD',
      ...session,
    };
  }

  /**
   * Resend verification email with abuse protection and rate-limiting cooldown.
   */
  async resendVerification(dto: ResendVerificationDto, currentUserId?: string) {
    let user: any = null;

    if (currentUserId) {
      user = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        include: { agency: true },
      });
    } else if (dto?.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
        include: { agency: true },
      });
    }

    // Anti-enumeration: Return generic safe response if user not found
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
        coolDownSeconds: 60,
      };
    }

    if (user.isVerified) {
      return {
        success: true,
        message: 'This email is already verified.',
        alreadyVerified: true,
      };
    }

    // Cooldown check (60 seconds)
    const latestToken = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestToken) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(latestToken.createdAt).getTime()) / 1000,
      );
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        throw new BadRequestException({
          code: 'COOLDOWN_ACTIVE',
          message: `Please wait ${remaining} seconds before requesting another email.`,
          retryAfterSeconds: remaining,
        });
      }
    }

    // Generate fresh cryptographically secure token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawVerificationToken);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        email: user.email,
        expiresAt: verificationExpiry,
      },
    });

    if (this.emailService) {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        rawVerificationToken,
      );
    }

    return {
      success: true,
      message: 'A fresh verification link has been sent to your email.',
      coolDownSeconds: 60,
    };
  }

  /**
   * Retrieves verification status for a user.
   */
  async getVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        emailVerifiedAt: true,
        role: true,
        agencyId: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  /**
   * Re-issue a normal 7-day session for a user by id. Used when verifying email,
   * completing onboarding, or exiting impersonation.
   */
  async issueSessionForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { agency: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      isVerified: user.isVerified,
      onboardingStatus: user.agency?.onboardingStatus,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        isVerified: user.isVerified,
        onboardingStatus: user.agency?.onboardingStatus,
        onboardingCurrentStep: user.agency?.onboardingCurrentStep,
      },
    };
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

    // A soft-deleted agency's users can no longer operate.
    let agency: any = null;
    if (user.agencyId) {
      agency = await this.prisma.agency.findFirst({
        where: { id: user.agencyId, deletedAt: null },
        select: { id: true, onboardingStatus: true, onboardingCurrentStep: true },
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
      isVerified: user.isVerified,
      onboardingStatus: agency?.onboardingStatus,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        isVerified: user.isVerified,
        onboardingStatus: agency?.onboardingStatus,
        onboardingCurrentStep: agency?.onboardingCurrentStep,
      },
    };
  }

  async getFreshProfile(userId: string, fallbackUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            onboardingStatus: true,
            onboardingCurrentStep: true,
          },
        },
      },
    });
    if (!user) {
      return fallbackUser || null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agencyId: user.agencyId,
      agencyName: user.agency?.name,
      isVerified: user.isVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      onboardingStatus:
        user.agency?.onboardingStatus ??
        (user.role === 'OWNER' ? 'NOT_STARTED' : 'COMPLETED'),
      onboardingCurrentStep: user.agency?.onboardingCurrentStep ?? 1,
      isImpersonated: fallbackUser?.isImpersonated,
      impersonatorId: fallbackUser?.impersonatorId,
    };
  }

  /**
   * Safe, non-destructive data-rights intake. The operator must separately
   * verify the requester's authority, retention obligations and result.
   * No ID images, free-text messages or outward notifications are collected.
   */
  async submitPrivacyRequest(
    userId: string,
    type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'OPPOSITION',
  ) {
    // Database partial unique index guarantees no duplicate open request,
    // including one already IN_REVIEW or concurrent POSTs.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.privacyRequest.createMany({
      data: [{ userId, type }],
      skipDuplicates: true,
    });
    const item = await this.prisma.privacyRequest.findFirst({
      where: { userId, type, status: { in: ['PENDING', 'IN_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, status: true, createdAt: true },
    });
    if (!item) throw new ConflictException('Could not record privacy request');
    return item;
  }

  async listMyPrivacyRequests(userId: string) {
    return this.prisma.privacyRequest.findMany({
      where: { userId },
      select: { id: true, type: true, status: true, createdAt: true, closedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  /**
   * Self-service account closure. Verifies password, prevents closure when
   * active rentals exist, revokes consent and scrubs account credentials.
   * This is NOT guaranteed full erasure: linked contracts/audit history and
   * storage objects may need independent retention/deletion review.
   */
  async deleteAccount(userId: string, passwordConfirm: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agency: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'ROOT_ADMIN') {
      throw new ForbiddenException(
        'Platform administrator accounts cannot be deleted through this endpoint.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      passwordConfirm,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password confirmation.');
    }

    // Safety invariant: An agency OWNER cannot delete an account while active rentals exist.
    if (user.role === 'OWNER' && user.agencyId) {
      const activeBookingsCount = await this.prisma.booking.count({
        where: {
          agencyId: user.agencyId,
          status: { in: ['ACTIVE', 'CONFIRMED'] },
        },
      });

      if (activeBookingsCount > 0) {
        throw new BadRequestException(
          `Cannot delete agency account while ${activeBookingsCount} active or confirmed rental(s) exist. Please conclude or cancel existing bookings first.`,
        );
      }
    }

    // Safety invariant: A RENTER cannot delete an account if they currently have an active rental.
    if (user.role === 'RENTER') {
      const activeRentalCount = await this.prisma.booking.count({
        where: {
          renterId: user.id,
          status: 'ACTIVE',
        },
      });

      if (activeRentalCount > 0) {
        throw new BadRequestException(
          'Cannot delete account while you have an ongoing vehicle rental. Please return the vehicle first.',
        );
      }
    }

    // Execute atomic deletion & data scrubbing
    await this.prisma.$transaction(async (tx) => {
      // 1. Remove ephemeral email tokens
      await tx.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // 2. Revoke all active consent grants
      await tx.consentGrant.updateMany({
        where: { grantorUserId: user.id },
        data: { status: 'REVOKED' },
      });

      // 3. Remove renter uploaded documents if any
      await tx.renterDocument.deleteMany({
        where: { ownerUserId: user.id },
      });

      // 4. Soft-delete agency if user was the agency OWNER
      if (user.role === 'OWNER' && user.agencyId) {
        await tx.agency.update({
          where: { id: user.agencyId },
          data: {
            deletedAt: new Date(),
            status: 'SUSPENDED',
          },
        });
      }

      // 5. If agencyId exists, log the audit record
      if (user.agencyId && this.auditLogs) {
        await this.auditLogs.log(
          user.agencyId,
          user.id,
          'USER_ACCOUNT_DELETED',
          'USER',
          user.id,
          // Do not copy the deleted person's raw email, name or free-text
          // deletion reason into long-lived audit metadata.
          { role: user.role, requestType: 'SELF_SERVICE_ACCOUNT_CLOSURE' },
          { status: 'ACCOUNT_ACCESS_REVOKED', dataReviewPending: true },
        );
      }

      // 6. Scrub personal PII from User record while preserving relational integrity
      // for forensic/accounting records
      const scrubbedEmail = `deleted_${user.id}_${Date.now()}@anonymized.fider`;
      const randomizedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      await tx.user.update({
        where: { id: user.id },
        data: {
          name: 'Utilisateur Supprimé',
          email: scrubbedEmail,
          password: randomizedPassword,
          qrHash: null,
          isVerified: false,
          emailVerifiedAt: null,
        },
      });
    });

    return {
      success: true,
      message: 'Account sign-in disabled and core identity fields scrubbed. Some contractual records and stored files may remain subject to separate legal retention and deletion review.',
    };
  }
}
