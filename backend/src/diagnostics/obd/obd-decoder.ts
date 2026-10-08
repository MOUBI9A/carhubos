import { BadRequestException } from '@nestjs/common';
import type { ObdEvent, Observation } from './telemetry.types';

type Decoder = {
  metric: string;
  unit: string;
  length: number;
  decode: (b: number[]) => number;
};
const word = (b: number[]) => b[0] * 256 + b[1];
const DECODERS: Record<number, Decoder> = {
  0x04: {
    metric: 'engineLoad',
    unit: '%',
    length: 1,
    decode: (b) => (b[0] * 100) / 255,
  },
  0x05: {
    metric: 'coolantTemperature',
    unit: '°C',
    length: 1,
    decode: (b) => b[0] - 40,
  },
  0x06: {
    metric: 'shortTermFuelTrim',
    unit: '%',
    length: 1,
    decode: (b) => ((b[0] - 128) * 100) / 128,
  },
  0x07: {
    metric: 'longTermFuelTrim',
    unit: '%',
    length: 1,
    decode: (b) => ((b[0] - 128) * 100) / 128,
  },
  0x0b: { metric: 'map', unit: 'kPa', length: 1, decode: (b) => b[0] },
  0x0c: { metric: 'rpm', unit: 'rpm', length: 2, decode: (b) => word(b) / 4 },
  0x0d: { metric: 'speed', unit: 'km/h', length: 1, decode: (b) => b[0] },
  0x10: { metric: 'maf', unit: 'g/s', length: 2, decode: (b) => word(b) / 100 },
  0x11: {
    metric: 'throttlePosition',
    unit: '%',
    length: 1,
    decode: (b) => (b[0] * 100) / 255,
  },
  0x14: {
    metric: 'oxygenSensorVoltage',
    unit: 'V',
    length: 2,
    decode: (b) => b[0] / 200,
  },
  0x42: {
    metric: 'controlModuleVoltage',
    unit: 'V',
    length: 2,
    decode: (b) => word(b) / 1000,
  },
};
// Supported Mode 01 PID payloads only. Transport/ELM/CAN framing belongs in a
// hardware adapter; the application never delegates byte parsing to an LLM.
export function decodeObd(event: ObdEvent): Observation {
  if (event.mode !== 1)
    throw new BadRequestException('Only OBD Mode 01 is supported');
  const decoder = DECODERS[event.pid];
  if (!decoder) throw new BadRequestException('Unsupported OBD PID');
  if (
    !Array.isArray(event.bytes) ||
    event.bytes.length !== decoder.length ||
    event.bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)
  ) {
    throw new BadRequestException('Malformed OBD PID payload');
  }
  return {
    metric: decoder.metric,
    unit: decoder.unit,
    value: decoder.decode(event.bytes),
  };
}
