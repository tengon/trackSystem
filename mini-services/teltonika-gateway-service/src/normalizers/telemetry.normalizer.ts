/**
 * Teltonika Telemetry Normalizer
 * Converts raw Teltonika AVL records into Internal Standard Normalized Format
 */

import { RawAvlRecord } from '../protocol/teltonika.protocol';
import { TELTONIKA_AVL_IDS, isTeltonikaAlarmEvent } from '../mappings/avl-id.mapping';
import { decodeCanTelemetry, DecodedCanTelemetry } from '../decoders/can.decoder';
import { decodeBleTelemetry, DecodedBleTelemetry } from '../decoders/ble.decoder';
import { decodeObdTelemetry, DecodedObdTelemetry } from '../decoders/obd.decoder';

export interface NormalizedTelemetry {
  timestamp: Date;
  priority: number;
  eventIoId: number;
  alarmEvent?: {
    isAlarm: boolean;
    type: string;
    label: string;
  };
  gps: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    angle: number;
    satellites: number;
    accuracy: number;
  };
  telemetry: {
    ignition: boolean;
    movement: boolean;
    batteryVoltage?: number;
    backupBatteryPercent?: number;
    batteryCurrentMa?: number;
    gsmSignal?: number;
    totalOdometer?: number;
    tripOdometer?: number;
    sleepMode?: number;
    operatorCode?: number;
  };
  can: DecodedCanTelemetry;
  ble: DecodedBleTelemetry;
  obd: DecodedObdTelemetry;
  rawIo: Record<number, number | bigint>;
  rawVariableIo?: Record<number, string>;
}

export function normalizeTelemetryRecord(record: RawAvlRecord): NormalizedTelemetry {
  const io = record.ioElements;
  const variableIo = record.variableIoElements;

  // External Battery Voltage (mV -> V)
  const extVoltageRaw = Number(io[TELTONIKA_AVL_IDS.EXTERNAL_VOLTAGE] ?? 0);
  const batteryVoltage = extVoltageRaw > 0 ? Number((extVoltageRaw / 1000).toFixed(2)) : undefined;

  // Ignition Detection: DIN1 / IO 239 OR IO 1 OR Alternator Voltage (> 13.2V)
  const ignition =
    io[TELTONIKA_AVL_IDS.IGNITION] === 1 ||
    io[TELTONIKA_AVL_IDS.DIN1] === 1 ||
    (extVoltageRaw >= 13200 && extVoltageRaw <= 32000);

  // Movement Detection: IO 240 or Speed > 2 km/h
  const movement = io[TELTONIKA_AVL_IDS.MOVEMENT] === 1 || record.speed > 2;

  // Internal Backup Battery % (IO 113 or derived from IO 67 in mV)
  const backupVoltageRaw = Number(io[TELTONIKA_AVL_IDS.BATTERY_VOLTAGE] ?? 0);
  let backupBatteryPercent: number | undefined = undefined;

  if (io[TELTONIKA_AVL_IDS.BATTERY_PERCENT] !== undefined) {
    backupBatteryPercent = Number(io[TELTONIKA_AVL_IDS.BATTERY_PERCENT]);
  } else if (backupVoltageRaw > 0) {
    const v = backupVoltageRaw / 1000;
    // Standard Teltonika 3.7V Li-ion curve (3.5V = 0%, 4.2V = 100%)
    backupBatteryPercent = Math.min(100, Math.max(0, Math.round(((v - 3.5) / 0.7) * 100)));
  }

  // GSM Signal (1-5 bars)
  const gsmSignal = io[TELTONIKA_AVL_IDS.GSM_SIGNAL] !== undefined ? Number(io[TELTONIKA_AVL_IDS.GSM_SIGNAL]) : undefined;

  // OBD-II Sub-decoder (FMC001, FMB001, FMC003, FMB003)
  const obd = decodeObdTelemetry(io, variableIo);

  // Total Odometer (meters -> km): Check IO 87, legacy IO 16, or OBD Odometer
  const odoMeters = Number(io[TELTONIKA_AVL_IDS.ODOMETER] ?? io[TELTONIKA_AVL_IDS.ODOMETER_LEGACY] ?? 0);
  const totalOdometer = odoMeters > 0 ? Number((odoMeters / 1000).toFixed(1)) : obd.odometerKm;

  // Trip distance (meters -> km)
  const tripMeters = Number(io[TELTONIKA_AVL_IDS.TRIP_ODOMETER] ?? io[TELTONIKA_AVL_IDS.TRIP_DISTANCE_250] ?? 0);
  const tripOdometer = tripMeters > 0 ? Number((tripMeters / 1000).toFixed(1)) : undefined;

  // Accuracy (calculate from satellites & HDOP)
  const hdopRaw = Number(io[TELTONIKA_AVL_IDS.HDOP] ?? 0);
  const satellites = record.satellites;
  let accuracy = 15;
  if (satellites > 0) {
    accuracy = hdopRaw > 0 ? Math.max(3, Number((hdopRaw / 10).toFixed(1))) : Math.max(5, 30 - satellites * 2);
  }

  // CAN-bus & BLE Sub-decoders
  const can = decodeCanTelemetry(io);
  const ble = decodeBleTelemetry(io);

  // Bridge OBD metrics into CAN fallback if CAN is missing
  if (can.rpm === undefined && obd.rpm !== undefined) can.rpm = obd.rpm;
  if (can.engineTemperature === undefined && obd.coolantTemperature !== undefined) {
    can.engineTemperature = obd.coolantTemperature;
  }
  if (can.fuelLevelPercent === undefined && obd.fuelLevelPercent !== undefined) {
    can.fuelLevelPercent = obd.fuelLevelPercent;
  }
  if (can.fuelConsumedLiters === undefined && obd.fuelConsumedLiters !== undefined) {
    can.fuelConsumedLiters = obd.fuelConsumedLiters;
  }
  if (can.acceleratorPedalPercent === undefined && obd.throttlePositionPercent !== undefined) {
    can.acceleratorPedalPercent = obd.throttlePositionPercent;
  }

  // Alarm event check
  let alarmEvent = isTeltonikaAlarmEvent(record.eventIoId);

  // Special OBD Unplug / DTC alarms
  if (obd.unplugged) {
    alarmEvent = { isAlarm: true, type: 'unplugged', label: 'Perangkat OBD Dicabut dari Port Kendaraan' };
  } else if (record.eventIoId === TELTONIKA_AVL_IDS.OBD_DTC_COUNT && obd.isFaultDetected) {
    const codes = obd.dtcCodes.length > 0 ? ` (${obd.dtcCodes.join(', ')})` : '';
    alarmEvent = { isAlarm: true, type: 'obd_dtc', label: `Kode Kerusakan OBD-II Terdeteksi${codes}` };
  }

  return {
    timestamp: new Date(record.timestampMs),
    priority: record.priority,
    eventIoId: record.eventIoId,
    alarmEvent: alarmEvent.isAlarm ? alarmEvent : undefined,
    gps: {
      latitude: record.latitude,
      longitude: record.longitude,
      altitude: record.altitude,
      speed: record.speed,
      angle: record.angle,
      satellites: record.satellites,
      accuracy,
    },
    telemetry: {
      ignition,
      movement,
      batteryVoltage: batteryVoltage ?? obd.controlModuleVoltage,
      backupBatteryPercent,
      batteryCurrentMa: io[TELTONIKA_AVL_IDS.BATTERY_CURRENT] !== undefined ? Number(io[TELTONIKA_AVL_IDS.BATTERY_CURRENT]) : undefined,
      gsmSignal,
      totalOdometer,
      tripOdometer,
      sleepMode: io[TELTONIKA_AVL_IDS.SLEEP_MODE] !== undefined ? Number(io[TELTONIKA_AVL_IDS.SLEEP_MODE]) : undefined,
      operatorCode: io[TELTONIKA_AVL_IDS.OPERATOR_CODE] !== undefined ? Number(io[TELTONIKA_AVL_IDS.OPERATOR_CODE]) : undefined,
    },
    can,
    ble,
    obd,
    rawIo: io,
    rawVariableIo: variableIo,
  };
}
