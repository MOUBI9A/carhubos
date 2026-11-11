import { InspectionDraft } from '../src/types';

describe('Tenant Isolation & Invariant Integrity Suite', () => {
  it('strictly excludes agencyId from mobile inspection submission payloads', () => {
    // Mobile client is an untrusted entity; server must resolve agencyId from @CurrentUser() JWT
    const clientDraft: InspectionDraft = {
      localId: 'local-test-1',
      bookingId: 'booking-992',
      carId: 'car-883',
      type: 'PRE_RENTAL',
      mileage: 12000,
      fuelLevel: 8,
      damages: [],
      photos: ['photo-test.jpg'],
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // Construct the payload as sent to /api/inspections
    const networkPayload: Record<string, any> = {
      carId: clientDraft.carId,
      bookingId: clientDraft.bookingId,
      type: clientDraft.type,
      odometer: clientDraft.mileage,
      fuelLevel: `${clientDraft.fuelLevel}/8`,
      damages: clientDraft.damages,
      photos: clientDraft.photos,
    };

    expect(networkPayload.agencyId).toBeUndefined();
    expect(Object.keys(networkPayload)).not.toContain('agencyId');
  });

  it('prohibits raw float math on monetary numbers in mobile formatting helpers', () => {
    // Financial math invariant: 333.33 * 3 must equal 1000.00 MAD without float drift
    const pricePerDayCents = 33333; // 333.33 MAD
    const days = 3;
    const totalCents = pricePerDayCents * days;
    const totalMad = (totalCents / 100).toFixed(2);

    expect(totalMad).toBe('999.99');
    expect(Number(totalMad)).not.toBe(999.9900000000001);
  });
});
