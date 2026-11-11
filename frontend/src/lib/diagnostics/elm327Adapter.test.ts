import { describe, it, expect, beforeEach } from 'vitest';
import { Elm327Adapter } from './elm327Adapter';

describe('Elm327Adapter', () => {
  let adapter: Elm327Adapter;

  beforeEach(() => {
    adapter = new Elm327Adapter();
  });

  it('initializes with disconnected status', () => {
    const status = adapter.getStatus();
    expect(status.connected).toBe(false);
    expect(status.transport).toBe('NONE');
  });

  it('detects browser support for Web Bluetooth and Web Serial', () => {
    const support = adapter.isSupported();
    expect(support).toHaveProperty('bluetooth');
    expect(support).toHaveProperty('serial');
  });

  it('decodes standard Mode 03 DTC hex strings correctly', async () => {
    // Mock sendCommand to return standard DTC payload:
    // 43 02 03 00 01 71 -> 2 codes: P0300, P0171
    adapter.sendCommand = async (cmd: string) => {
      if (cmd === '03') {
        return '43 02 03 00 01 71>';
      }
      return 'OK>';
    };

    const dtcs = await adapter.readDtcs();
    expect(dtcs).toEqual(['P0300', 'P0171']);
  });

  it('handles empty DTC response with no codes', async () => {
    adapter.sendCommand = async (cmd: string) => {
      if (cmd === '03') {
        return '43 00>';
      }
      return 'OK>';
    };

    const dtcs = await adapter.readDtcs();
    expect(dtcs).toEqual([]);
  });

  it('decodes Engine Speed (RPM - PID 0C)', async () => {
    // 41 0C 1A F8 -> ((0x1A * 256) + 0xF8) / 4 = ((26 * 256) + 248) / 4 = (6656 + 248) / 4 = 1726 RPM
    adapter.sendCommand = async (cmd: string) => {
      if (cmd === '010C') return '41 0C 1A F8>';
      return 'OK>';
    };

    const reading = await adapter.pollPid('0C');
    expect(reading).toBeDefined();
    expect(reading?.pid).toBe(12);
    expect(reading?.metric).toBe('Engine Speed');
    expect(reading?.value).toBe(1726);
    expect(reading?.unit).toBe('RPM');
  });

  it('decodes Coolant Temperature (PID 05)', async () => {
    // 41 05 5A -> 0x5A = 90. 90 - 40 = 50°C
    adapter.sendCommand = async (cmd: string) => {
      if (cmd === '0105') return '41 05 5A>';
      return 'OK>';
    };

    const reading = await adapter.pollPid('05');
    expect(reading).toBeDefined();
    expect(reading?.value).toBe(50);
    expect(reading?.unit).toBe('°C');
  });

  it('decodes Vehicle Speed (PID 0D)', async () => {
    // 41 0D 50 -> 0x50 = 80 km/h
    adapter.sendCommand = async (cmd: string) => {
      if (cmd === '010D') return '41 0D 50>';
      return 'OK>';
    };

    const reading = await adapter.pollPid('0D');
    expect(reading).toBeDefined();
    expect(reading?.value).toBe(80);
    expect(reading?.unit).toBe('km/h');
  });
});
