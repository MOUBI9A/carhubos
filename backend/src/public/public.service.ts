import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

interface EstimateTokenPayload {
  workOrderId: string;
  agencyId: string;
  exp: number;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private getSigningKey(): string {
    const key = process.env.JWT_SECRET || process.env.IDENTITY_PEPPER;
    if (!key) {
      // In production, invariant #5 mandates fail-fast if JWT secret is unset
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be configured for estimate token signing');
      }
      return 'fider-estimate-approval-dev-secret-key-32b';
    }
    return key;
  }

  /**
   * Generates a tamper-proof cryptographic token valid for 7 days.
   */
  generateEstimateToken(agencyId: string, workOrderId: string): string {
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const payload: EstimateTokenPayload = {
      workOrderId,
      agencyId,
      exp,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(payloadB64)
      .digest('base64url');

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies the cryptographic token signature and checks expiry.
   */
  verifyEstimateToken(token: string): EstimateTokenPayload {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      throw new UnauthorizedException('Token de validation de devis invalide ou manquant');
    }

    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) {
      throw new UnauthorizedException('Format du token de devis invalide');
    }

    const expectedSig = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new UnauthorizedException('Signature du devis invalide ou altérée');
    }

    let payload: EstimateTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Payload de devis illisible');
    }

    if (!payload.workOrderId || !payload.agencyId || !payload.exp) {
      throw new UnauthorizedException('Contenu du token incomplet');
    }

    if (Date.now() > payload.exp) {
      throw new UnauthorizedException('Ce lien d\'approbation a expiré (validité 7 jours)');
    }

    return payload;
  }

  /**
   * Retrieves public estimate details scoped by tenant isolation (404 on invalid).
   */
  async getPublicEstimate(token: string) {
    const { workOrderId, agencyId } = this.verifyEstimateToken(token);

    const order = await this.prisma.workOrder.findUnique({
      where: {
        id_agencyId: {
          id: workOrderId,
          agencyId,
        },
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            businessPhone: true,
            contactEmail: true,
            deletedAt: true,
          },
        },
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
            vin: true,
          },
        },
        fleetCar: {
          select: {
            brand: true,
            model: true,
            licensePlate: true,
          },
        },
      },
    });

    if (!order || order.agency.deletedAt !== null) {
      throw new NotFoundException('Devis introuvable ou indisponible');
    }

    // Mask VIN for customer privacy: show first 3 and last 4 characters
    let maskedVin: string | null = null;
    if (order.vehicle?.vin && order.vehicle.vin.length >= 8) {
      const v = order.vehicle.vin;
      maskedVin = `${v.substring(0, 3)}••••••••${v.substring(v.length - 4)}`;
    }

    const rawParts = (order as any).parts;
    const parts = (Array.isArray(rawParts) ? rawParts : []) as Array<{
      partNumber?: string;
      name?: string;
      quantity?: number;
      unitPrice?: number;
    }>;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      priority: order.priority,
      description: order.description,
      customerNotes: order.customerNotes,
      laborHours: Number(order.laborHours),
      laborRate: Number(order.laborRate),
      laborTotal: Number(order.laborTotal),
      partsTotal: Number(order.partsTotal),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency || 'MAD',
      parts,
      createdAt: order.createdAt,
      agency: {
        name: order.agency.name,
        city: order.agency.city,
        address: order.agency.address,
        businessPhone: order.agency.businessPhone,
        contactEmail: order.agency.contactEmail,
      },
      vehicle: {
        brand: order.fleetCar?.brand || order.vehicle?.brand || 'Véhicule',
        model: order.fleetCar?.model || order.vehicle?.model || 'Atelier',
        year: order.vehicle?.year || null,
        licensePlate: order.fleetCar?.licensePlate || null,
        maskedVin,
      },
    };
  }

  /**
   * Approves the estimate digitally by the car owner/renter.
   */
  async approvePublicEstimate(
    token: string,
    body: { customerName?: string; signature?: string; notes?: string },
  ) {
    const { workOrderId, agencyId } = this.verifyEstimateToken(token);

    const order = await this.prisma.workOrder.findUnique({
      where: {
        id_agencyId: {
          id: workOrderId,
          agencyId,
        },
      },
      select: {
        id: true,
        agencyId: true,
        orderNumber: true,
        status: true,
        customerNotes: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Devis introuvable');
    }

    if (order.status === 'APPROVED') {
      return {
        success: true,
        status: 'APPROVED',
        message: 'Ce devis a déjà été approuvé préalablement.',
      };
    }

    if (order.status !== 'AWAITING_APPROVAL' && order.status !== 'DRAFT') {
      throw new BadRequestException(
        `Impossible d'approuver un ordre de réparation avec le statut actuel: ${order.status}`,
      );
    }

    const timestamp = new Date().toLocaleString('fr-FR');
    const customerSigner = (body.customerName || 'Client').trim();
    const approvalAuditEntry = `[APPROBATION NUMÉRIQUE CLIENT ${timestamp}] Signé par: ${customerSigner}.${
      body.notes ? ` Note: ${body.notes.trim()}` : ''
    }`;

    const updatedNotes = order.customerNotes
      ? `${order.customerNotes}\n\n${approvalAuditEntry}`
      : approvalAuditEntry;

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.workOrder.update({
        where: {
          id_agencyId: {
            id: workOrderId,
            agencyId,
          },
        },
        data: {
          status: 'APPROVED',
          customerNotes: updatedNotes,
        },
      });
    });

    await this.auditLogs.log(
      agencyId,
      'PUBLIC_CUSTOMER',
      'WORK_ORDER_CUSTOMER_APPROVED',
      'WORK_ORDER',
      workOrderId,
      { status: order.status },
      { status: 'APPROVED', customerSigner, timestamp },
    );

    return {
      success: true,
      orderNumber: updated.orderNumber,
      status: 'APPROVED',
      message: 'Devis approuvé avec succès. L\'atelier a été notifié pour lancer les travaux.',
    };
  }
}
