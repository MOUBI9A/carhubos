'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Bluetooth,
  CheckCircle,
  Gauge,
  Play,
  Radio,
  Square,
  Thermometer,
  Usb,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { elm327 } from '@/lib/diagnostics/elm327Adapter';

interface LiveObservation {
  metric: string;
  value: number;
  unit: string;
}

interface LivePacket {
  sequence: number;
  observedAt: string;
  pid: number;
  observation: LiveObservation;
}

interface LiveDtc {
  code: string;
  status: string;
  freezeFrame?: Record<string, number>;
}

export function DiagnosticBayGauges({
  sessionId,
  canPerform,
  onDtcDetected,
}: {
  sessionId: string;
  canPerform: boolean;
  onDtcDetected?: (dtcs: LiveDtc[]) => void;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [sourceMode, setSourceMode] = useState<'SIMULATOR' | 'BLUETOOTH' | 'SERIAL'>('SIMULATOR');
  const [hardwareName, setHardwareName] = useState<string | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('p0301');
  const [rpm, setRpm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [coolant, setCoolant] = useState(0);
  const [stft, setStft] = useState(0);
  const [ltft, setLtft] = useState(0);
  const [voltage, setVoltage] = useState(14.1);
  const [engineLoad, setEngineLoad] = useState(0);
  const [packetCount, setPacketCount] = useState(0);
  const [detectedDtcs, setDetectedDtcs] = useState<LiveDtc[]>([]);
  const [recentPackets, setRecentPackets] = useState<LivePacket[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hwPollIntervalRef = useRef<any>(null);

  const startStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setDetectedDtcs([]);
    setRecentPackets([]);
    setPacketCount(0);
    setIsStreaming(true);

    const url = `/api/diagnostics/sessions/${sessionId}/stream?scenario=${selectedScenario}&seed=${Math.floor(
      Math.random() * 1000,
    )}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'telemetry' && msg.payload?.event) {
          const raw = msg.payload.event;
          const obs: LiveObservation = raw.observation;

          setPacketCount((c) => c + 1);
          setRecentPackets((prev) => [
            {
              sequence: raw.sequence,
              observedAt: raw.observedAt,
              pid: raw.pid,
              observation: obs,
            },
            ...prev.slice(0, 7),
          ]);

          // Route to gauge meters
          if (obs.metric === 'rpm') setRpm(Math.round(obs.value));
          if (obs.metric === 'speed') setSpeed(Math.round(obs.value));
          if (obs.metric === 'coolantTemperature') setCoolant(Math.round(obs.value));
          if (obs.metric === 'shortTermFuelTrim') setStft(Math.round(obs.value * 10) / 10);
          if (obs.metric === 'longTermFuelTrim') setLtft(Math.round(obs.value * 10) / 10);
          if (obs.metric === 'controlModuleVoltage') setVoltage(Math.round(obs.value * 10) / 10);
          if (obs.metric === 'engineLoad') setEngineLoad(Math.round(obs.value));
        } else if (msg.type === 'dtc' && msg.payload?.dtcs) {
          setDetectedDtcs(msg.payload.dtcs);
          if (onDtcDetected) {
            onDtcDetected(msg.payload.dtcs);
          }
        } else if (msg.type === 'complete') {
          setIsStreaming(false);
          es.close();
        }
      } catch {
        // Ignored unparsable packet
      }
    };

    es.onerror = () => {
      setIsStreaming(false);
      es.close();
    };
  };

  const startHardwareStream = async (mode: 'BLUETOOTH' | 'SERIAL') => {
    setHardwareError(null);
    try {
      let status;
      if (mode === 'BLUETOOTH') {
        status = await elm327.connectBluetooth();
      } else {
        status = await elm327.connectSerial();
      }
      setSourceMode(mode);
      setHardwareName(status.deviceName ?? 'ELM327 OBD-II');
      if (status.voltage) setVoltage(status.voltage);
      setIsStreaming(true);

      let seq = 0;
      hwPollIntervalRef.current = setInterval(async () => {
        try {
          const rpmReading = await elm327.pollPid('0C');
          if (rpmReading) {
            setRpm(rpmReading.value);
            setPacketCount((c) => c + 1);
            setRecentPackets((prev) => [
              { sequence: ++seq, observedAt: new Date().toISOString(), pid: 12, observation: rpmReading },
              ...prev.slice(0, 7),
            ]);
          }

          const spdReading = await elm327.pollPid('0D');
          if (spdReading) setSpeed(spdReading.value);

          const cltReading = await elm327.pollPid('05');
          if (cltReading) setCoolant(cltReading.value);

          const loadReading = await elm327.pollPid('04');
          if (loadReading) setEngineLoad(loadReading.value);

          const stftReading = await elm327.pollPid('06');
          if (stftReading) setStft(stftReading.value);

          const ltftReading = await elm327.pollPid('07');
          if (ltftReading) setLtft(ltftReading.value);

          if (seq % 15 === 0) {
            const dtcs = await elm327.readDtcs();
            if (dtcs.length > 0) {
              const liveDtcs = dtcs.map((code) => ({ code, status: 'CONFIRMED' }));
              setDetectedDtcs(liveDtcs);
              if (onDtcDetected) onDtcDetected(liveDtcs);
            }
          }
        } catch {}
      }, 300);
    } catch (err: any) {
      setHardwareError(err.message || 'Failed to connect to OBD-II device');
      setIsStreaming(false);
    }
  };

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (hwPollIntervalRef.current) {
      clearInterval(hwPollIntervalRef.current);
      hwPollIntervalRef.current = null;
    }
    elm327.disconnect();
    setHardwareName(null);
    setSourceMode('SIMULATOR');
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (hwPollIntervalRef.current) {
        clearInterval(hwPollIntervalRef.current);
      }
      elm327.disconnect();
    };
  }, []);

  // Gauge helpers
  const rpmPercent = Math.min(Math.max(rpm / 7000, 0), 1);
  const rpmNeedleDeg = -120 + rpmPercent * 240;
  const isRedline = rpm >= 6000;

  const speedPercent = Math.min(Math.max(speed / 240, 0), 1);
  const speedNeedleDeg = -120 + speedPercent * 240;

  const isOverheating = coolant >= 105;

  return (
    <Card className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-metal" />
              Diagnostic Bay Live Telemetry Stream
            </h3>
            {hardwareName && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                {sourceMode === 'BLUETOOTH' ? <Bluetooth className="h-3 w-3" /> : <Usb className="h-3 w-3" />}
                {hardwareName}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            High-frequency OBD-II parameter streaming, live hardware pairing, and real-time fault detection
          </p>
          {hardwareError && (
            <p className="mt-1 text-xs text-red-400 font-medium">
              {hardwareError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sourceMode === 'SIMULATOR' && (
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              disabled={isStreaming || !canPerform}
              className="px-3 py-1.5 text-xs rounded-xl bg-surface border border-hairline focus:outline-none focus:border-primary text-text-primary"
            >
              <option value="p0301">Scenario: Cylinder 1 Misfire (P0301)</option>
              <option value="p0171">Scenario: Lean Fuel Trim (P0171)</option>
              <option value="p0420">Scenario: Catalyst Efficiency (P0420)</option>
              <option value="overheating">Scenario: Engine Overheating (115°C+)</option>
              <option value="city_driving">Scenario: Normal City Driving</option>
              <option value="highway_driving">Scenario: Highway Cruise (110 km/h)</option>
            </select>
          )}

          {isStreaming ? (
            <Button variant="danger" size="sm" onClick={stopStream}>
              <Square className="h-3.5 w-3.5" /> Stop Stream
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={!canPerform}
                onClick={startStream}
              >
                <Play className="h-3.5 w-3.5" /> Start Live Stream
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canPerform}
                onClick={() => startHardwareStream('BLUETOOTH')}
                title="Pair with Bluetooth ELM327 dongle"
              >
                <Bluetooth className="h-3.5 w-3.5 text-blue-400" /> BLE Dongle
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canPerform}
                onClick={() => startHardwareStream('SERIAL')}
                title="Connect USB OBD-II cable"
              >
                <Usb className="h-3.5 w-3.5 text-amber-400" /> USB Cable
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Streaming Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-raised border border-hairline text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isStreaming
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-neutral-600'
            }`}
          />
          <span className="font-medium text-text-primary">
            {isStreaming
              ? 'Connected to OBD-II Bus (12.5 Hz)'
              : 'Standby — Ready for telemetry stream'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-text-muted">
          <span>Packets: <strong className="text-text-primary font-mono">{packetCount}</strong></span>
          <span>Voltage: <strong className="text-text-primary font-mono">{voltage > 0 ? `${voltage} V` : '--'}</strong></span>
        </div>
      </div>

      {/* DTC Trigger Alert Banner */}
      {detectedDtcs.length > 0 && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wide">
                Fault Code Triggered During Stream
              </p>
              <p className="text-xs text-text-primary mt-0.5">
                ECU recorded: {detectedDtcs.map((d) => `${d.code} (${d.status})`).join(', ')}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 font-mono text-xs font-bold">
            MIL ON
          </span>
        </div>
      )}

      {/* Radial Analog Gauges Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tachometer / RPM Gauge */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-raised flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Gauge Background Arc */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className="text-neutral-800"
                strokeWidth="8"
                strokeDasharray="180 300"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className={isRedline ? 'text-red-500' : 'text-primary'}
                strokeWidth="8"
                strokeDasharray={`${rpmPercent * 180} 300`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black font-mono tracking-tight ${isRedline ? 'text-red-400 animate-pulse' : 'text-text-primary'}`}>
                {rpm}
              </span>
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                RPM × 1000
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-text-muted mt-2">Engine Tachometer</span>
        </div>

        {/* Speedometer */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-raised flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className="text-neutral-800"
                strokeWidth="8"
                strokeDasharray="180 300"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className="text-blue-500"
                strokeWidth="8"
                strokeDasharray={`${speedPercent * 180} 300`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono tracking-tight text-text-primary">
                {speed}
              </span>
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                KM / H
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-text-muted mt-2">Vehicle Speed</span>
        </div>

        {/* Coolant Temperature */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-raised flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className={`h-5 w-5 ${isOverheating ? 'text-red-400 animate-bounce' : 'text-metal'}`} />
            <span className={`text-2xl font-black font-mono ${isOverheating ? 'text-red-400' : 'text-text-primary'}`}>
              {coolant > 0 ? `${coolant}°C` : '--'}
            </span>
          </div>
          <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden my-2">
            <div
              className={`h-full transition-all duration-300 ${
                isOverheating
                  ? 'bg-red-500'
                  : coolant > 95
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(Math.max((coolant / 130) * 100, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-[10px] text-text-muted">
            <span>0°C</span>
            <span className="text-emerald-400">Normal 85-95°</span>
            <span className="text-red-400">130°C</span>
          </div>
          <span className="text-xs font-semibold text-text-muted mt-2">Engine Coolant</span>
        </div>

        {/* Engine Load & Trims */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-raised flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Calculated Load</span>
                <span className="font-mono font-bold">{engineLoad}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-200"
                  style={{ width: `${engineLoad}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Short-Term Trim (STFT)</span>
                <span className={`font-mono font-bold ${Math.abs(stft) > 10 ? 'text-amber-400' : 'text-text-primary'}`}>
                  {stft > 0 ? `+${stft}%` : `${stft}%`}
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-200 ${stft > 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(Math.max(((stft + 25) / 50) * 100, 0), 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Long-Term Trim (LTFT)</span>
                <span className={`font-mono font-bold ${Math.abs(ltft) > 10 ? 'text-amber-400' : 'text-text-primary'}`}>
                  {ltft > 0 ? `+${ltft}%` : `${ltft}%`}
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-200 ${ltft > 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(Math.max(((ltft + 25) / 50) * 100, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>

          <span className="text-xs font-semibold text-text-muted text-center mt-2">
            Fuel Trims & Combustion Load
          </span>
        </div>
      </div>

      {/* Live Rolling Packet Feed */}
      {recentPackets.length > 0 && (
        <div className="border border-hairline rounded-xl overflow-hidden bg-surface">
          <div className="p-3 bg-surface-raised border-b border-hairline flex items-center justify-between text-xs">
            <span className="font-semibold text-text-muted flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-metal" /> Rolling Packet Ingestion Feed
            </span>
            <span className="font-mono text-text-muted">Mode 01 OBD-II</span>
          </div>
          <div className="divide-y divide-hairline font-mono text-xs max-h-36 overflow-auto">
            {recentPackets.map((pkt) => (
              <div
                key={`${pkt.sequence}-${pkt.pid}`}
                className="px-4 py-2 flex items-center justify-between hover:bg-surface-raised/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">#{pkt.sequence}</span>
                  <span className="text-metal">PID 0x{pkt.pid.toString(16).padStart(2, '0')}</span>
                  <span className="font-sans font-medium text-text-primary">{pkt.observation.metric}</span>
                </div>
                <div className="font-bold text-text-primary">
                  {pkt.observation.value} {pkt.observation.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
