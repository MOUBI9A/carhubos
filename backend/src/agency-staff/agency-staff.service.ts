import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_PRESETS, STAFF_PRESETS } from '../common/capabilities';
import {
  CreateStaffDto,
  UpdateStaffCapabilitiesDto,
} from './dto/agency-staff.dto';

/**
 * Staff management for one agency tenant. EVERY method is keyed on the caller's
 * `agencyId` (from the JWT, passed by the controller) — so a target user in
 * another agency is simply not found here and surfaces as 404, never leaking
 * cross-tenant existence.
 */
@Injectable()
export class AgencyStaffService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve a preset name → its capability set (role presets ∪ staff presets). */
  private capsForPreset(preset: string): string[] | undefined {
    return ROLE_PRESETS[preset] ?? STAFF_PRESETS[preset];
  }

  private shape(m: {
    userId: string;
    rolePreset: string;
    capabilities: string[];
    user: { name: string; email: string; role: string };
  }) {
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.user.role,
      rolePreset: m.rolePreset,
      capabilities: m.capabilities,
    };
  }

  /** List the agency's memberships with each member's identity fields. */
  async list(agencyId: string) {
    const memberships = await this.prisma.agencyMembership.findMany({
      where: { agencyId },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => this.shape(m));
  }

  /**
   * Create a staff User (role AGENT, scoped to the caller's agency) + its
   * AgencyMembership seeded from the chosen preset, atomically.
   *
   * Anti-escalation: the preset's capability set is held to the SAME invariant
   * as updateCapabilities() — a non-ROOT_ADMIN caller may only seed
   * capabilities they themselves hold. Otherwise a delegate holding only
   * staff.manage could mint an OWNER-preset account and escalate through it.
   */
  async create(
    agencyId: string,
    callerUserId: string,
    callerRole: string,
    dto: CreateStaffDto,
  ) {
    const caps = this.capsForPreset(dto.preset);
    if (!caps) {
      // DTO @IsIn already guards this; defensive belt-and-suspenders.
      throw new ConflictException('Unknown preset.');
    }

    if (callerRole !== 'ROOT_ADMIN') {
      const caller = await this.prisma.agencyMembership.findUnique({
        where: { userId_agencyId: { userId: callerUserId, agencyId } },
      });
      const callerCaps = new Set(caller?.capabilities ?? []);
      const escalated = caps.filter((c) => !callerCaps.has(c));
      if (escalated.length > 0) {
        throw new ForbiddenException(
          `Cannot grant capabilities you do not hold: ${escalated.join(', ')}.`,
        );
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const membership = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
            role: 'AGENT',
            agencyId,
          },
        });
        return tx.agencyMembership.create({
          data: {
            userId: user.id,
            agencyId,
            capabilities: caps,
            rolePreset: dto.preset,
          },
          include: {
            user: { select: { name: true, email: true, role: true } },
          },
        });
      });
      return this.shape(membership);
    } catch (e) {
      // Lost the race on the unique email (or unique membership) constraint.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists.');
      }
      throw e;
    }
  }

  /**
   * Replace a staff member's capability set.
   *   - Target must be a membership in the caller's agency → else 404.
   *   - Every new cap is already validated ⊂ AGENCY_CAPABILITIES by the DTO.
   *   - Anti-escalation: a non-ROOT_ADMIN caller can only grant caps they
   *     themselves hold.
   */
  async updateCapabilities(
    agencyId: string,
    callerUserId: string,
    callerRole: string,
    targetUserId: string,
    dto: UpdateStaffCapabilitiesDto,
  ) {
    const target = await this.prisma.agencyMembership.findUnique({
      where: { userId_agencyId: { userId: targetUserId, agencyId } },
    });
    if (!target) {
      throw new NotFoundException('Staff member not found.');
    }

    if (callerRole !== 'ROOT_ADMIN') {
      const caller = await this.prisma.agencyMembership.findUnique({
        where: { userId_agencyId: { userId: callerUserId, agencyId } },
      });
      const callerCaps = new Set(caller?.capabilities ?? []);
      const escalated = dto.capabilities.filter((c) => !callerCaps.has(c));
      if (escalated.length > 0) {
        throw new ForbiddenException(
          `Cannot grant capabilities you do not hold: ${escalated.join(', ')}.`,
        );
      }
    }

    // Lockout guard (applies to every caller incl. ROOT_ADMIN): stripping
    // staff.manage from the LAST member holding it would leave the agency
    // with nobody able to manage staff.
    if (
      target.capabilities.includes('staff.manage') &&
      !dto.capabilities.includes('staff.manage')
    ) {
      const holders = await this.prisma.agencyMembership.count({
        where: { agencyId, capabilities: { has: 'staff.manage' } },
      });
      if (holders <= 1) {
        throw new ForbiddenException(
          'Cannot remove staff.manage from the last member holding it.',
        );
      }
    }

    const updated = await this.prisma.agencyMembership.update({
      where: { userId_agencyId: { userId: targetUserId, agencyId } },
      data: { capabilities: dto.capabilities },
      include: { user: { select: { name: true, email: true, role: true } } },
    });
    return this.shape(updated);
  }

  /**
   * Remove a staff member from the caller's agency.
   *   - Only a member of the caller's agency → else 404.
   *   - Cannot remove yourself.
   *   - Cannot remove the last remaining OWNER of the agency.
   * Hard-deletes the User; the membership cascades (schema onDelete: Cascade).
   */
  async remove(agencyId: string, callerUserId: string, targetUserId: string) {
    if (callerUserId === targetUserId) {
      throw new ForbiddenException('You cannot remove yourself.');
    }

    const target = await this.prisma.agencyMembership.findUnique({
      where: { userId_agencyId: { userId: targetUserId, agencyId } },
      include: { user: { select: { role: true } } },
    });
    if (!target) {
      throw new NotFoundException('Staff member not found.');
    }

    const targetIsOwner =
      target.user.role === 'OWNER' || target.rolePreset === 'OWNER';
    if (targetIsOwner) {
      const ownerCount = await this.prisma.agencyMembership.count({
        where: {
          agencyId,
          OR: [{ rolePreset: 'OWNER' }, { user: { role: 'OWNER' } }],
        },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner.');
      }
    }

    // Hard-delete the user; AgencyMembership cascades via the FK relation.
    // Inspection.inspector is a REQUIRED relation (FK Restrict) — a staff
    // member who performed inspections cannot be hard-deleted; surface that
    // as a 409 instead of a raw P2003 → 500.
    try {
      await this.prisma.user.delete({ where: { id: targetUserId } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          'Staff member has operational history (inspections); reassign or deactivate instead',
        );
      }
      throw e;
    }
    return { deleted: true, userId: targetUserId };
  }
}
