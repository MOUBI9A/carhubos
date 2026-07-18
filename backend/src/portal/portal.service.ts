import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Renter self-service reads. EVERY method is keyed on the caller's own `userId`
 * (from the JWT, passed by the controller) — never a body/param id — so a
 * renter can only ever reach their own profile, bookings and notifications.
 */
@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  /** The renter's profile + their global trust summary (if identity-linked). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        trustScore: true,
        isVerified: true,
        qrHash: true,
        createdAt: true,
        renterIdentityId: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let trustSummary:
      | { linked: false; message: string }
      | {
          linked: true;
          globalScore: number;
          reviewCount: number;
          riskLevel: string;
        } = { linked: false, message: 'no network history' };

    if (user.renterIdentityId) {
      const identity = await this.prisma.renterIdentity.findUnique({
        where: { id: user.renterIdentityId },
        select: { globalScore: true, reviewCount: true, riskLevel: true },
      });
      if (identity) {
        trustSummary = { linked: true, ...identity };
      }
    }

    return { ...user, trustSummary };
  }

  /**
   * The renter's OWN document vault (RenterDocument), self-scoped on the
   * caller's `userId`. This is the owner reading their own documents, so it
   * needs NO consent grant — the consent gate governs AGENCY reads of this same
   * vault (see ConsentService.readDocuments), not the owner's own view.
   */
  async documents(userId: string) {
    return this.prisma.renterDocument.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        type: true,
        label: true,
        fileUrl: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** The renter's bookings, newest first, with car + status + dates + price. */
  async bookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { renterId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        totalPrice: true,
        createdAt: true,
        car: {
          select: {
            id: true,
            brand: true,
            model: true,
            year: true,
            licensePlate: true,
          },
        },
      },
    });
  }

  /** The renter's notifications, newest first. */
  async notifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark one of the renter's notifications read. The WHERE carries `userId`, so
   * another user's notification is simply not matched (count 0 → 404) — a
   * cross-user write is impossible.
   */
  async markNotificationRead(userId: string, notificationId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    if (res.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return { id: notificationId, read: true };
  }
}
