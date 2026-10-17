/**
 * ELM327 OBD-II Hardware Adapter.
 *
 * Implements hardware communication with physical OBD-II scan tools (vLinker,
 * OBDLink, ELM327 Bluetooth/USB) using standard browser Web Bluetooth and
 * Web Serial APIs.
 *
 * Supported Protocols:
 *   - Web Bluetooth: Standard BLE UART characteristics (Nordic UART, FFE0, FFF0).
 *   - Web Serial: Direct USB/UART serial adapters (FTDI, CH340, CP2102) at 38400 / 115200 baud.
 */

export interface ObdReading {
  pid: number;
  metric: string;
  value: number;
  unit: string;
  rawHex: string;
}

export interface Elm327Status {
  connected: boolean;
  transport: 'BLUETOOTH' | 'SERIAL' | 'NONE';
  deviceName?: string;
  protocolName?: string;
  voltage?: number;
}

const BLE_SERVICE_UUIDS = [
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard BLE OBD-II
  '0000fff0-0000-1000-8000-00805f9b34fb', // Vgate / vLinker BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
];

const BLE_CHAR_UUIDS = [
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000fff1-0000-1000-8000-00805f9b34fb',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // TX
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // RX
];

export class Elm327Adapter {
  private status: Elm327Status = { connected: false, transport: 'NONE' };
  private bleDevice: any = null;
  private bleCharacteristicRx: any = null;
  private bleCharacteristicTx: any = null;
  private serialPort: any = null;
  private serialReader: any = null;
  private serialWriter: any = null;
  private receiveBuffer = '';

  getStatus(): Elm327Status {
    return { ...this.status };
  }

  isSupported(): { bluetooth: boolean; serial: boolean } {
    return {
      bluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
      serial: typeof navigator !== 'undefined' && 'serial' in navigator,
    };
  }

  /**
   * Connect via Web Bluetooth (BLE OBD-II adapter).
   */
  async connectBluetooth(): Promise<Elm327Status> {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (!nav || !nav.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
    }

    const device = await nav.bluetooth.requestDevice({
      filters: [{ namePrefix: 'OBD' }, { namePrefix: 'V-LINK' }, { namePrefix: 'ELM' }, { namePrefix: 'Viecar' }],
      optionalServices: BLE_SERVICE_UUIDS,
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Failed to connect to Bluetooth GATT server');

    let primaryService: any = null;
    for (const uuid of BLE_SERVICE_UUIDS) {
      try {
        primaryService = await server.getPrimaryService(uuid);
        if (primaryService) break;
      } catch {}
    }

    if (!primaryService) throw new Error('No compatible OBD-II BLE service found on device.');

    for (const charUuid of BLE_CHAR_UUIDS) {
      try {
        const char = await primaryService.getCharacteristic(charUuid);
        if (char.properties.notify || char.properties.indicate) {
          this.bleCharacteristicRx = char;
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (e: any) => {
            const val = new TextDecoder().decode(e.target.value);
            this.receiveBuffer += val;
          });
        }
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.bleCharacteristicTx = char;
        }
      } catch {}
    }

    this.bleDevice = device;
    this.status = {
      connected: true,
      transport: 'BLUETOOTH',
      deviceName: device.name ?? 'BLE OBD-II Adapter',
    };

    await this.initializeElm327();
    return this.status;
  }

  /**
   * Connect via Web Serial (USB OBD-II cable e.g. OBDLink SX / FTDI).
   */
  async connectSerial(baudRate = 38400): Promise<Elm327Status> {
    const nav = navigator as any;
    if (typeof navigator === 'undefined' || !nav.serial) {
      throw new Error('Web Serial is not supported in this browser. Use Chrome or Edge.');
    }

    const port = await nav.serial.requestPort();
    await port.open({ baudRate });

    this.serialPort = port;
    this.serialWriter = port.writable.getWriter();
    this.status = {
      connected: true,
      transport: 'SERIAL',
      deviceName: 'USB OBD-II Interface',
    };

    this.startSerialReader(port);

    await this.initializeElm327();
    return this.status;
  }

  private async startSerialReader(port: any) {
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    this.serialReader = decoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        if (value) {
          this.receiveBuffer += value;
        }
      }
    } catch {}
  }

  /**
   * Send command to ELM327 and wait for response prompt ('>').
   */
  async sendCommand(cmd: string, timeoutMs = 2500): Promise<string> {
    if (!this.status.connected) throw new Error('ELM327 adapter is not connected');

    this.receiveBuffer = '';
    const payload = cmd.trim() + '\r';

    if (this.status.transport === 'BLUETOOTH' && this.bleCharacteristicTx) {
      const data = new TextEncoder().encode(payload);
      await this.bleCharacteristicTx.writeValue(data);
    } else if (this.status.transport === 'SERIAL' && this.serialWriter) {
      const data = new TextEncoder().encode(payload);
      await this.serialWriter.write(data);
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.receiveBuffer.includes('>')) {
        const clean = this.receiveBuffer.replace('>', '').trim();
        return clean;
      }
      await new Promise((r) => setTimeout(r, 20));
    }

    return this.receiveBuffer.trim();
  }

  /**
   * Standard ELM327 boot sequence.
   */
  private async initializeElm327() {
    await this.sendCommand('ATZ');   // Reset
    await this.sendCommand('ATE0');  // Echo Off
    await this.sendCommand('ATL0');  // Linefeed Off
    await this.sendCommand('ATH1');  // Headers On
    await this.sendCommand('ATSP0'); // Automatic protocol search

    const voltResp = await this.sendCommand('ATRV');
    const vMatch = voltResp.match(/(\d+\.?\d*)V/i);
    if (vMatch) {
      this.status.voltage = parseFloat(vMatch[1]);
    }
  }

  /**
   * Poll live SAE PID values.
   */
  async pollPid(pidHex: string): Promise<ObdReading | null> {
    const resp = await this.sendCommand(`01${pidHex}`);
    if (resp.includes('NO DATA') || resp.includes('ERROR') || resp.includes('?')) {
      return null;
    }

    const hexBytes = resp.replace(/\s+/g, '').replace(/^41/, '');
    const pid = parseInt(pidHex, 16);

    switch (pid) {
      case 0x0c: { // RPM: ((A*256)+B)/4
        const a = parseInt(hexBytes.slice(2, 4), 16) || 0;
        const b = parseInt(hexBytes.slice(4, 6), 16) || 0;
        const rpm = Math.round(((a * 256) + b) / 4);
        return { pid, metric: 'Engine Speed', value: rpm, unit: 'RPM', rawHex: resp };
      }
      case 0x0d: { // Vehicle Speed: A
        const spd = parseInt(hexBytes.slice(2, 4), 16) || 0;
        return { pid, metric: 'Vehicle Speed', value: spd, unit: 'km/h', rawHex: resp };
      }
      case 0x05: { // Coolant Temp: A - 40
        const c = (parseInt(hexBytes.slice(2, 4), 16) || 0) - 40;
        return { pid, metric: 'Coolant Temp', value: c, unit: '°C', rawHex: resp };
      }
      case 0x04: { // Engine Load: (A*100)/255
        const load = Math.round(((parseInt(hexBytes.slice(2, 4), 16) || 0) * 100) / 255);
        return { pid, metric: 'Engine Load', value: load, unit: '%', rawHex: resp };
      }
      case 0x06: { // STFT: ((A-128)*100)/128
        const stft = parseFloat(((((parseInt(hexBytes.slice(2, 4), 16) || 0) - 128) * 100) / 128).toFixed(1));
        return { pid, metric: 'Short Term Fuel Trim', value: stft, unit: '%', rawHex: resp };
      }
      case 0x07: { // LTFT: ((A-128)*100)/128
        const ltft = parseFloat(((((parseInt(hexBytes.slice(2, 4), 16) || 0) - 128) * 100) / 128).toFixed(1));
        return { pid, metric: 'Long Term Fuel Trim', value: ltft, unit: '%', rawHex: resp };
      }
      default:
        return null;
    }
  }

  /**
   * Read stored DTC trouble codes via Mode 03.
   */
  async readDtcs(): Promise<string[]> {
    const resp = await this.sendCommand('03');
    if (resp.includes('NO DATA') || resp.includes('43 00')) {
      return [];
    }

    const codes: string[] = [];
    const clean = resp.replace(/[^0-9A-Fa-f]/g, '');
    const dtcData = clean.replace(/^43/, '');
    for (let i = 2; i + 4 <= dtcData.length; i += 4) {
      const chunk = dtcData.slice(i, i + 4);
      if (chunk === '0000') continue;
      const firstHex = parseInt(chunk[0], 16);
      const prefix = ['P', 'C', 'B', 'U'][Math.floor(firstHex / 4)];
      const secondDigit = (firstHex % 4).toString();
      const code = `${prefix}${secondDigit}${chunk.slice(1)}`.toUpperCase();
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }

    return codes;
  }

  /**
   * Clear active DTC codes via Mode 04.
   */
  async clearDtcs(): Promise<boolean> {
    const resp = await this.sendCommand('04');
    return resp.includes('44') || resp.includes('OK');
  }

  async disconnect() {
    try {
      if (this.bleDevice?.gatt?.connected) {
        this.bleDevice.gatt.disconnect();
      }
      if (this.serialReader) {
        await this.serialReader.cancel();
      }
      if (this.serialWriter) {
        await this.serialWriter.close();
      }
      if (this.serialPort) {
        await this.serialPort.close();
      }
    } finally {
      this.status = { connected: false, transport: 'NONE' };
      this.bleDevice = null;
      this.serialPort = null;
    }
  }
}

export const elm327 = new Elm327Adapter();
