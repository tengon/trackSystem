/**
 * Teltonika FMC001 & FMB001 OBD-II Telemetry Decoder
 * Specialised decoder for Teltonika Plug & Play OBD-II Trackers (FMC001, FMB001, FMC003, FMB003)
 * Decodes standard SAE J1979 / OBD-II PIDs and OEM vehicle telemetry
 */

import { TELTONIKA_AVL_IDS } from '../mappings/avl-id.mapping';

export interface DecodedObdTelemetry {
  rpm?: number;                     // Engine RPM (IO 36 or IO 85)
  speed?: number;                   // Vehicle Speed in km/h (IO 37 or IO 81)
  coolantTemperature?: number;      // Engine Coolant Temperature in °C (IO 32 or IO 115)
  engineLoadPercent?: number;       // Calculated Engine Load % (IO 31 or IO 51)
  throttlePositionPercent?: number; // Throttle Position % (IO 41, IO 53, or IO 55)
  fuelLevelPercent?: number;        // Fuel Level % (IO 47 or IO 84)
  fuelPressureKpa?: number;         // Fuel Rail / Delivery Pressure in kPa (IO 34 or IO 44)
  intakeAirTemperature?: number;    // Intake Air Temperature in °C (IO 39)
  manifoldPressureKpa?: number;     // Intake Manifold Absolute Pressure in kPa (IO 35)
  mafAirFlow?: number;              // Mass Air Flow Rate in g/s (IO 40)
  timingAdvance?: number;           // Timing Advance in degrees (IO 38)
  shortTermFuelTrim?: number;       // Short Term Fuel Trim % (IO 33)
  controlModuleVoltage?: number;    // Control Module Voltage in Volts (IO 50, converted from mV)
  runtimeSinceStartSeconds?: number;// Run Time since engine start in seconds (IO 42)
  engineRunTimeTotalSeconds?: number;// Total engine lifetime hours/seconds (IO 59 or IO 102)
  distanceMilOnKm?: number;         // Distance traveled with Check Engine / MIL ON (IO 43)
  distanceSinceClearKm?: number;    // Distance traveled since DTC codes cleared (IO 48)
  barometricPressureKpa?: number;   // Ambient Barometric Pressure in kPa (IO 49)
  ambientAirTemperature?: number;   // Ambient Air Temperature in °C (IO 54)
  fuelConsumedLiters?: number;      // Total Fuel Consumed in Liters (IO 83)
  fuelRateLitersPerHour?: number;   // Fuel Consumption Rate in L/h (IO 89)
  odometerKm?: number;              // Total Odometer in km (IO 87 or IO 16)
  acceleratorPedalPercent?: number; // Accelerator Pedal Position % (IO 82 or IO 114)
  unplugged: boolean;               // Unplug event (IO 252 === 1, disconnected from OBD port)
  dtcCount: number;                 // Diagnostic Trouble Codes count (IO 30)
  dtcCodes: string[];               // Formatted DTC Trouble Codes (e.g. ['P0300', 'P0171'])
  vin?: string;                     // Vehicle Identification Number 17-char string (IO 256)
  isFaultDetected: boolean;         // Flag indicating vehicle diagnostic warning
}

/**
 * Parses SAE J2012 2-byte OBD-II Diagnostic Trouble Codes from Hex String or Raw Bytes
 */
export function parseDtcCodes(rawHexOrString?: string): string[] {
  if (!rawHexOrString) return [];

  const trimmed = rawHexOrString.trim();
  if (!trimmed) return [];

  // 1. If payload is already ASCII string with DTCs (e.g. "P0300,P0171" or "P0300 P0171")
  if (/^[PCBU]\d{4}/i.test(trimmed)) {
    const matches = trimmed.match(/[PCBU]\d{4}/gi);
    return matches ? matches.map((m) => m.toUpperCase()) : [];
  }

  // 2. Decode standard 2-byte hex encoded DTC codes (SAE J2012 / ISO 15031-6)
  const dtcList: string[] = [];
  const hex = trimmed.replace(/\s+/g, '');

  for (let i = 0; i + 4 <= hex.length; i += 4) {
    const b0 = parseInt(hex.substring(i, i + 2), 16);
    const b1 = parseInt(hex.substring(i + 2, i + 4), 16);

    // Skip all zeros (no fault)
    if (b0 === 0 && b1 === 0) continue;

    // First 2 bits: System Category
    const systemCode = (b0 >> 6) & 0x03;
    const systems = ['P', 'C', 'B', 'U']; // Powertrain, Chassis, Body, Network
    const system = systems[systemCode];

    // Next 2 bits: 0, 1, 2, or 3
    const d1 = (b0 >> 4) & 0x03;
    // Next 4 bits: second digit (hex char)
    const d2 = (b0 & 0x0f).toString(16).toUpperCase();
    // Byte 1 high nibble: third digit
    const d3 = ((b1 >> 4) & 0x0f).toString(16).toUpperCase();
    // Byte 1 low nibble: fourth digit
    const d4 = (b1 & 0x0f).toString(16).toUpperCase();

    const dtc = `${system}${d1}${d2}${d3}${d4}`;
    if (!dtcList.includes(dtc)) {
      dtcList.push(dtc);
    }
  }

  return dtcList;
}

/**
 * Decodes 17-character VIN (Vehicle Identification Number)
 */
export function decodeVinString(
  rawIoValue?: number | bigint,
  variableHex?: string
): string | undefined {
  if (variableHex) {
    try {
      const ascii = Buffer.from(variableHex, 'hex')
        .toString('ascii')
        .replace(/[\x00-\x1F\x7F-\xFF]/g, '')
        .trim();
      // Valid VIN standard: 17 alphanumeric chars (excluding I, O, Q)
      if (ascii.length >= 11 && /^[A-HJ-NPR-Z0-9]+$/i.test(ascii)) {
        return ascii.toUpperCase();
      }
      if (ascii.length >= 5) {
        return ascii;
      }
    } catch {
      /* ignore decoding error */
    }
  }

  if (rawIoValue !== undefined) {
    const str = String(rawIoValue).trim();
    if (str.length >= 11) return str;
  }

  return undefined;
}

/**
 * Main FMC001 / FMB001 OBD-II Telemetry Decoder
 * Extracts and maps all OBD-II PIDs and OEM diagnostics from raw AVL IO elements
 */
export function decodeObdTelemetry(
  ioElements: Record<number, number | bigint>,
  variableIoElements?: Record<number, string>
): DecodedObdTelemetry {
  const getNum = (id: number): number | undefined => {
    return ioElements[id] !== undefined ? Number(ioElements[id]) : undefined;
  };

  // 1. Engine RPM: Prefer IO 36 (OBD RPM), fallback to IO 85 (CAN RPM)
  const rpm = getNum(TELTONIKA_AVL_IDS.OBD_RPM) ?? getNum(TELTONIKA_AVL_IDS.CAN_RPM);

  // 2. Vehicle Speed: Prefer IO 37 (OBD Speed), fallback to IO 81 (CAN Speed)
  const speed = getNum(TELTONIKA_AVL_IDS.OBD_SPEED) ?? getNum(TELTONIKA_AVL_IDS.CAN_VEHICLE_SPEED);

  // 3. Coolant Temperature: Prefer IO 32 (OBD Coolant Temp), fallback to IO 115 (CAN Engine Temp)
  const coolantTemperature = getNum(TELTONIKA_AVL_IDS.OBD_COOLANT_TEMP) ?? getNum(TELTONIKA_AVL_IDS.CAN_ENGINE_TEMP);

  // 4. Engine Load %: IO 31 or IO 51 (Absolute Load)
  const engineLoadPercent = getNum(TELTONIKA_AVL_IDS.OBD_ENGINE_LOAD) ?? getNum(TELTONIKA_AVL_IDS.OBD_ABSOLUTE_LOAD);

  // 5. Throttle Position %: IO 41, IO 53 (Relative), IO 55 (Position B)
  const throttlePositionPercent =
    getNum(TELTONIKA_AVL_IDS.OBD_THROTTLE_POSITION) ??
    getNum(TELTONIKA_AVL_IDS.OBD_RELATIVE_THROTTLE) ??
    getNum(TELTONIKA_AVL_IDS.OBD_THROTTLE_POS_B);

  // 6. Fuel Level %: Prefer IO 47 (OBD Fuel Level), fallback to IO 84 (CAN Fuel Level)
  const fuelLevelPercent = getNum(TELTONIKA_AVL_IDS.OBD_FUEL_LEVEL) ?? getNum(TELTONIKA_AVL_IDS.CAN_FUEL_LEVEL);

  // 7. Fuel Pressure in kPa: IO 34 (OBD Fuel Pressure) or IO 44 (Fuel Rail)
  const fuelPressureKpa = getNum(TELTONIKA_AVL_IDS.OBD_FUEL_PRESSURE) ?? getNum(TELTONIKA_AVL_IDS.OBD_FUEL_RAIL_PRESSURE);

  // 8. Intake Air & Ambient Temp
  const intakeAirTemperature = getNum(TELTONIKA_AVL_IDS.OBD_INTAKE_AIR_TEMP);
  const ambientAirTemperature = getNum(TELTONIKA_AVL_IDS.OBD_AMBIENT_AIR_TEMP);

  // 9. Manifold Absolute Pressure (MAP) & Mass Air Flow (MAF)
  const manifoldPressureKpa = getNum(TELTONIKA_AVL_IDS.OBD_INTAKE_MAP);
  const rawMaf = getNum(TELTONIKA_AVL_IDS.OBD_MAF);
  const mafAirFlow = rawMaf !== undefined ? (rawMaf > 500 ? Number((rawMaf / 100).toFixed(2)) : rawMaf) : undefined;

  // 10. Timing Advance & Short Term Fuel Trim
  const timingAdvance = getNum(TELTONIKA_AVL_IDS.OBD_TIMING_ADVANCE);
  const shortTermFuelTrim = getNum(TELTONIKA_AVL_IDS.OBD_SHORT_FUEL_TRIM);

  // 11. Control Module Voltage (IO 50 in mV -> Volts)
  const rawModuleVoltage = getNum(TELTONIKA_AVL_IDS.OBD_CONTROL_MODULE_VOLTAGE);
  const controlModuleVoltage = rawModuleVoltage !== undefined && rawModuleVoltage > 0
    ? Number((rawModuleVoltage / 1000).toFixed(2))
    : undefined;

  // 12. Engine Run Time
  const runtimeSinceStartSeconds = getNum(TELTONIKA_AVL_IDS.OBD_RUNTIME_SINCE_START);
  const engineRunTimeTotalSeconds = getNum(TELTONIKA_AVL_IDS.OBD_RUNTIME_TOTAL);

  // 13. Diagnostics: MIL Distance & Since Clear
  const distanceMilOnKm = getNum(TELTONIKA_AVL_IDS.OBD_DISTANCE_MIL_ON);
  const distanceSinceClearKm = getNum(TELTONIKA_AVL_IDS.OBD_DISTANCE_SINCE_CLEAR);
  const barometricPressureKpa = getNum(TELTONIKA_AVL_IDS.OBD_BAROMETRIC_PRESSURE);

  // 14. Fuel Consumed (IO 83 in 0.1L -> Liters) & Fuel Rate
  const rawFuelConsumed = getNum(TELTONIKA_AVL_IDS.CAN_FUEL_CONSUMED);
  const fuelConsumedLiters = rawFuelConsumed !== undefined ? Number((rawFuelConsumed / 10).toFixed(1)) : undefined;
  const fuelRateLitersPerHour = getNum(TELTONIKA_AVL_IDS.OBD_COMM_THROTTLE_ACT);

  // 15. Odometer (IO 87 or IO 16 in meters -> km)
  const odoMeters = getNum(TELTONIKA_AVL_IDS.ODOMETER) ?? getNum(TELTONIKA_AVL_IDS.ODOMETER_LEGACY);
  const odometerKm = odoMeters !== undefined && odoMeters > 0 ? Number((odoMeters / 1000).toFixed(1)) : undefined;

  // 16. Accelerator Pedal Position % (IO 82, IO 56, IO 114)
  const acceleratorPedalPercent =
    getNum(TELTONIKA_AVL_IDS.OBD_ACCEL_PEDAL_POS_D) ??
    getNum(TELTONIKA_AVL_IDS.CAN_ACCELERATOR);

  // 17. Unplug Detection: IO 252 (1 = Unplugged / Disconnected from vehicle OBD-II socket)
  const unplugged = ioElements[TELTONIKA_AVL_IDS.UNPLUG_DETECTION] === 1;

  // 18. DTC Codes & Count: IO 30 & IO 281
  const rawDtcCount = getNum(TELTONIKA_AVL_IDS.OBD_DTC_COUNT) ?? 0;
  const rawDtcHex = variableIoElements?.[TELTONIKA_AVL_IDS.OBD_DTC_CODES];
  const dtcCodes = parseDtcCodes(rawDtcHex);
  const dtcCount = Math.max(rawDtcCount, dtcCodes.length);

  // 19. VIN (Vehicle Identification Number): IO 256
  const vin = decodeVinString(
    ioElements[TELTONIKA_AVL_IDS.OBD_VIN],
    variableIoElements?.[TELTONIKA_AVL_IDS.OBD_VIN]
  );

  // 20. Fault Warning Detected Flag
  const isFaultDetected = dtcCount > 0 || (distanceMilOnKm !== undefined && distanceMilOnKm > 0);

  return {
    rpm,
    speed,
    coolantTemperature,
    engineLoadPercent,
    throttlePositionPercent,
    fuelLevelPercent,
    fuelPressureKpa,
    intakeAirTemperature,
    manifoldPressureKpa,
    mafAirFlow,
    timingAdvance,
    shortTermFuelTrim,
    controlModuleVoltage,
    runtimeSinceStartSeconds,
    engineRunTimeTotalSeconds,
    distanceMilOnKm,
    distanceSinceClearKm,
    barometricPressureKpa,
    ambientAirTemperature,
    fuelConsumedLiters,
    fuelRateLitersPerHour,
    odometerKm,
    acceleratorPedalPercent,
    unplugged,
    dtcCount,
    dtcCodes,
    vin,
    isFaultDetected,
  };
}
