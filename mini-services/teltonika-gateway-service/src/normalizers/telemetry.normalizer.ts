/**
 * Teltonika Telemetry Normalizer
 * Converts raw Teltonika AVL records into Internal Standard Normalized Format
 */

import { RawAvlRecord } from '../protocol/teltonika.protocol';
import { TELTONIKA_AVL_IDS } from '../mappings/avl-id.mapping';
import { decodeCanTelemetry, DecodedCanTelemetry } from '../decoders/can.decoder';
import { decodeBleTelemetry, DecodedBleTelemetry } from '../decoders/ble.decoder';

export interface NormalizedTelemetry {
  timestamp: Date;
  priority: number;
  gps: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    angle: number;
    satellites: number;
  };
  telemetry: {
    ignition: boolean;
    movement: boolean;
    batteryVoltage?: number;
    backupBatteryPercent?: number;
    gsmSignal?: number;
    totalOdometer?: number;
  };
  can: DecodedCanTelemetry;
  ble: DecodedBleTelemetry;
  rawIo: Record<number, number | bigint>;
}

export function normalizeTelemetryRecord(record: RawAvlRecord): NormalizedTelemetry {
  const io = record.ioElements;

  // Ignition (DIN1 / IO 239 or IO 1)
  const ignition = io[TELTONIKA_AVL_IDS.IGNITION] === 1 || io[TELTONIKA_AVL_IDS.DIN1] === 1;

  // Movement (IO 240 or speed > 2 km/h)
  const movement = io[TELTONIKA_AVL_IDS.MOVEMENT] === 1 || record.speed > 2;

  // External Battery Voltage (mV -> V)
  const extVoltageRaw = Number(io[TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE] ?? 0);
  const batteryVoltage = extVoltageRaw > 0 ? extVoltageRaw / 1000 : undefined;

  // Internal Backup Battery %
  const backupVoltageRaw = Number(io[TELTONIKA_AVL_IDS.BATTERY_VOLTAGE] ?? 0);
  let backupBatteryPercent: number | undefined = undefined;

  if (io[TELTONIKA_AVL_IDS.BATTERY_PERCENT] !== undefined) {
    backupBatteryPercent = Number(io[TELTONIKA_AVL_IDS.BATTERY_PERCENT]);
  } else if (backupVoltageRaw > 0) {
    const v = backupVoltageRaw / 1000;
    backupBatteryPercent = Math.min(100, Math.max(0, Math.round(((v - 3.6) / 0.6) * 100)));
  }

  // GSM Signal
  const gsmSignal = io[TELTONIKA_AVL_IDS.GSM_SIGNAL] !== undefined ? Number(io[TELTONIKA_AVL_IDS.GSM_SIGNAL]) : undefined;

  // Odometer (meters -> km)
  const odoMeters = Number(io[TELTONIKA_AVL_IDS.ODOMETER] ?? io[TELTONIKA_AVL_IDS.TRIP_ODOMETER] ?? 0);
  const totalOdometer = odoMeters > 0 ? Math.round(odoMeters / 1000) : undefined;

  // CAN-bus & BLE Sub-decoders
  const can = decodeCanTelemetry(io);
  const ble = decodeBleTelemetry(io);

  return {
    timestamp: new Date(record.timestampMs),
    priority: record.priority,
    gps: {
      latitude: record.latitude,
      longitude: record.longitude,
      altitude: record.altitude,
      speed: record.speed,
      angle: record.angle,
      satellites: record.satellites,
    },
    telemetry: {
      ignition,
      movement,
      batteryVoltage,
      backupBatteryPercent,
      gsmSignal,
      totalOdometer,
    },
    can,
    ble,
    rawIo: io,
  };
}
