import { Injectable } from '@nestjs/common';
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
   * Generates a unique, encrypted hash for a renter's Trust Vault QR code.
   */
  async generateTrustQr(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'RENTER')
      throw new Error('User not found or not a renter');

    const rawData = `${user.id}:${user.email}:${Date.now()}`;
    const qrHash = crypto.createHash('sha256').update(rawData).digest('hex');

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
