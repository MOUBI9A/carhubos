import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Generates a fresh, unguessable Trust Vault QR token for a renter.
   *
   * qrHash is a bearer credential (consent.service.ts resolves a renter from
   * it — see `requestGrant`), not an identity hash that needs to be
   * recomputed and matched — it must never be derived from data an attacker
   * could know or guess (userId/email are not secret; a hash of them plus a
   * millisecond timestamp is brute-forceable within any plausible generation
   * window). Cryptographically random, full stop.
   */
  async generateTrustQr(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'RENTER') {
      throw new NotFoundException('User not found or not a renter');
    }

    const qrHash = crypto.randomBytes(32).toString('hex');

    return this.prisma.user.update({
      where: { id: userId },
      data: { qrHash },
    });
  }

  /**
   * Verifies a renter after manual document audit.
   */
  async verifyRenter(userId: string, trustScore: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        trustScore: trustScore,
      },
    });
  }
}
