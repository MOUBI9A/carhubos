import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCarDto } from '../cars/dto/cars.dto';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../customers/dto/customers.dto';
import { UpdateBookingDto } from '../bookings/dto/bookings.dto';

/**
 * Data-integrity guard for the pseudo-enum String fields. The global
 * ValidationPipe strips unknown *properties* but does nothing about an unknown
 * *value* on a plain string field — so before these @IsIn constraints, an API
 * caller could persist e.g. car.status='SOLD' or customer.status='FOO' and
 * corrupt the UI state machines. These tests assert each constrained field
 * rejects a bogus value and accepts a real one.
 */
async function errorsOn(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

const VALID_CAR = {
  brand: 'Dacia',
  model: 'Logan',
  year: 2022,
  licensePlate: '1234-A-56',
  pricePerDay: 300,
};
const VALID_CUSTOMER = {
  firstName: 'Amina',
  lastName: 'El Idrissi',
  phone: '0600000000',
  identityType: 'CIN',
  identityNumber: 'AB12345',
};

describe('DTO enum constraints — reject bogus values, accept real ones', () => {
  it('CreateCarDto.status rejects an unknown fleet state', async () => {
    expect(await errorsOn(plainToInstance(CreateCarDto, { ...VALID_CAR, status: 'SOLD' }), 'status')).toBe(true);
    expect(await errorsOn(plainToInstance(CreateCarDto, { ...VALID_CAR, status: 'MAINTENANCE' }), 'status')).toBe(false);
    // status is optional — omitting it is still valid.
    expect(await errorsOn(plainToInstance(CreateCarDto, VALID_CAR), 'status')).toBe(false);
  });

  it('CreateCustomerDto.identityType rejects an undocumented ID type', async () => {
    expect(
      await errorsOn(plainToInstance(CreateCustomerDto, { ...VALID_CUSTOMER, identityType: 'DRIVING_LICENSE' }), 'identityType'),
    ).toBe(true);
    expect(
      await errorsOn(plainToInstance(CreateCustomerDto, { ...VALID_CUSTOMER, identityType: 'PASSPORT' }), 'identityType'),
    ).toBe(false);
  });

  it('UpdateCustomerDto.status rejects anything but ACTIVE/BLACKLISTED', async () => {
    expect(await errorsOn(plainToInstance(UpdateCustomerDto, { status: 'FOO' }), 'status')).toBe(true);
    expect(await errorsOn(plainToInstance(UpdateCustomerDto, { status: 'BLACKLISTED' }), 'status')).toBe(false);
  });

  it('UpdateBookingDto.status rejects an illegal lifecycle state', async () => {
    expect(await errorsOn(plainToInstance(UpdateBookingDto, { status: 'PAUSED' }), 'status')).toBe(true);
    // OVERDUE is a real state (cron-driven) and must be accepted.
    expect(await errorsOn(plainToInstance(UpdateBookingDto, { status: 'OVERDUE' }), 'status')).toBe(false);
  });
});
