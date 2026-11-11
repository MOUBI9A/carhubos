import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Estimate, EstimateItem } from '../obd/telemetry.types';
export function calculateEstimate(
  items: Omit<EstimateItem, 'total'>[],
  vatRate = '0.20',
): Estimate {
  if (!items.length || items.length > 50)
    throw new BadRequestException('Provide 1–50 estimate items');
  if (!/^(0(\.\d{1,4})?|1(\.0{1,4})?)$/.test(vatRate))
    throw new BadRequestException('Invalid VAT rate');
  let subtotal = new Prisma.Decimal(0);
  const normalized = items.map((item) => {
    if (
      !/^\d{1,5}(\.\d{1,3})?$/.test(item.quantity) ||
      !/^\d{1,8}(\.\d{1,2})?$/.test(item.unitPrice)
    )
      throw new BadRequestException('Invalid quantity or price');
    const quantity = new Prisma.Decimal(item.quantity);
    if (quantity.lte(0))
      throw new BadRequestException('Quantity must be positive');
    const total = quantity
      .times(new Prisma.Decimal(item.unitPrice))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    subtotal = subtotal.plus(total);
    return {
      ...item,
      quantity: quantity.toString(),
      unitPrice: new Prisma.Decimal(item.unitPrice).toFixed(2),
      total: total.toFixed(2),
    };
  });
  const tax = subtotal
    .times(new Prisma.Decimal(vatRate))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const total = subtotal.plus(tax);
  if (total.gt('9999999999.99'))
    throw new BadRequestException('Estimate exceeds supported monetary range');
  return {
    items: normalized,
    subtotal: subtotal.toFixed(2),
    vatRate,
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    currency: 'MAD',
    source: 'MANUAL',
    fitmentVerified: false,
    assumptions: [
      'Manual technician prices and labor quantities; no supplier quote, OEM labor schedule, or verified parts fitment.',
      'VAT calculated from the explicitly supplied rate; this is an estimate, not an invoice.',
    ],
  };
}
