/**
 * Teltonika AVL ID Definitions & Mapping Table
 * Maps Teltonika IO IDs across all hardware series (FMB, FMC, FMM, RUT, TMT, TST, TFT)
 */

export const TELTONIKA_AVL_IDS = {
  // Standard Digital Inputs / Outputs
  IGNITION: 239,       // DIN1 / Ignition (1=ON, 0=OFF)
  MOVEMENT: 240,       // Movement sensor (1=Moving, 0=Stopped)
  DIN1: 1,             // Digital Input 1
  DIN2: 2,             // Digital Input 2
  DIN3: 3,             // Digital Input 3
  DIN4: 4,             // Digital Input 4
  DOUT1: 179,          // Digital Output 1 (Relay / Immobilizer)
  DOUT2: 180,          // Digital Output 2
  AIN1: 9,             // Analog Input 1 in mV
  AIN2: 10,            // Analog Input 2 in mV

  // Power & Battery Telemetry
  EXTERNAL_VOLTAGE: 66,   // External Power Supply Voltage in mV (e.g. 12400 = 12.4V)
  BATTERY_VOLTAGE: 67,    // Backup Battery Voltage in mV (e.g. 4100 = 4.1V)
  BATTERY_CURRENT: 68,    // Battery Current in mA
  BATTERY_PERCENT: 113,   // Internal Battery level in % (0..100)

  // Network & System
  GSM_SIGNAL: 21,         // GSM Signal Level (1..5)
  GNSS_STATUS: 69,        // GNSS Status (0=OFF, 1=ON without fix, 2=ON with fix, 3=sleep)
  PDOP: 181,              // Position Dilution of Precision
  HDOP: 182,              // Horizontal Dilution of Precision
  SLEEP_MODE: 200,        // Sleep Mode (0=Disable, 1=GPS Sleep, 2=Deep Sleep, 3=Online Deep Sleep, 4=Ultra Deep Sleep)
  OPERATOR_CODE: 241,     // GSM Operator Code (MCC+MNC)

  // Speed, Distance & Driving
  SPEED: 24,              // Speed in km/h
  ODOMETER: 87,           // Total Odometer in meters (Standard Modern Teltonika)
  ODOMETER_LEGACY: 16,    // Total Odometer in meters (Legacy FMB)
  TRIP_ODOMETER: 199,     // Trip distance in meters
  TRIP_DISTANCE_250: 250, // Trip distance alternative
  OVER_SPEEDING: 255,     // Over-speeding event
  GREEN_DRIVING_TYPE: 253,// 1=Harsh Acceleration, 2=Harsh Braking, 3=Harsh Cornering
  GREEN_DRIVING_VALUE: 254,// Green driving g-force value

  // CAN-bus & FMS Fleet Telemetry
  CAN_RPM: 85,            // Engine RPM
  CAN_ENGINE_TEMP: 115,   // Engine Temperature in °C
  CAN_FUEL_LEVEL: 84,     // Fuel level percentage (0..100%)
  CAN_FUEL_CONSUMED: 83,  // Total fuel consumed in 0.1 liters
  CAN_ACCELERATOR: 114,   // Accelerator pedal position %
  CAN_ENGINE_HOURS: 102,  // Engine work time / hours
  CAN_VEHICLE_SPEED: 81,  // Vehicle CAN speed

  // FMC001 & FMB001 OBD-II Standard PIDs & OEM Diagnostics
  OBD_DTC_COUNT: 30,              // Number of diagnostic trouble codes
  OBD_ENGINE_LOAD: 31,            // Calculated engine load value (%)
  OBD_COOLANT_TEMP: 32,           // Coolant temperature (°C)
  OBD_SHORT_FUEL_TRIM: 33,        // Short term fuel trim bank 1 (%)
  OBD_FUEL_PRESSURE: 34,          // Fuel pressure (kPa)
  OBD_INTAKE_MAP: 35,             // Intake manifold absolute pressure (kPa)
  OBD_RPM: 36,                    // Engine RPM
  OBD_SPEED: 37,                  // Vehicle speed (km/h)
  OBD_TIMING_ADVANCE: 38,         // Timing advance (deg)
  OBD_INTAKE_AIR_TEMP: 39,        // Intake air temperature (°C)
  OBD_MAF: 40,                    // Mass air flow rate (g/s)
  OBD_THROTTLE_POSITION: 41,      // Throttle position (%)
  OBD_RUNTIME_SINCE_START: 42,    // Run time since engine start (seconds)
  OBD_DISTANCE_MIL_ON: 43,        // Distance traveled with MIL lamp ON (km)
  OBD_FUEL_RAIL_PRESSURE: 44,     // Fuel rail pressure (kPa)
  OBD_FUEL_RAIL_GAUGE: 45,        // Fuel rail gauge pressure (kPa)
  OBD_COMMANDED_EGR: 46,          // Commanded EGR (%)
  OBD_FUEL_LEVEL: 47,             // Fuel level input (%)
  OBD_DISTANCE_SINCE_CLEAR: 48,   // Distance traveled since codes cleared (km)
  OBD_BAROMETRIC_PRESSURE: 49,    // Barometric pressure (kPa)
  OBD_CONTROL_MODULE_VOLTAGE: 50, // Control module voltage (mV)
  OBD_ABSOLUTE_LOAD: 51,          // Absolute load value (%)
  OBD_FUEL_AIR_RATIO: 52,         // Fuel/Air commanded equivalence ratio
  OBD_RELATIVE_THROTTLE: 53,      // Relative throttle position (%)
  OBD_AMBIENT_AIR_TEMP: 54,       // Ambient air temperature (°C)
  OBD_THROTTLE_POS_B: 55,         // Absolute throttle position B (%)
  OBD_ACCEL_PEDAL_POS_D: 56,      // Accelerator pedal position D (%)
  OBD_ACCEL_PEDAL_POS_E: 57,      // Accelerator pedal position E (%)
  OBD_COMM_THROTTLE_ACT: 58,      // Commanded throttle actuator (%)
  OBD_RUNTIME_TOTAL: 59,          // Total engine run time (seconds)
  OBD_VIN: 256,                   // Vehicle Identification Number (ASCII string)
  OBD_DTC_CODES: 281,             // Diagnostic Trouble Codes (DTCs)

  // BLE (Bluetooth Low Energy) Sensors
  BLE_TEMP_1: 25,         // BLE Temperature Sensor 1 (°C x 10)
  BLE_TEMP_2: 26,         // BLE Temperature Sensor 2
  BLE_TEMP_3: 27,         // BLE Temperature Sensor 3
  BLE_TEMP_4: 28,         // BLE Temperature Sensor 4
  BLE_HUMIDITY_1: 86,     // BLE Humidity Sensor 1 (% x 10)
  BLE_HUMIDITY_2: 104,    // BLE Humidity Sensor 2
  BLE_HUMIDITY_3: 106,    // BLE Humidity Sensor 3
  BLE_HUMIDITY_4: 108,    // BLE Humidity Sensor 4
  BLE_BATTERY_1: 29,      // BLE Sensor 1 Battery Level (%)
  BLE_BATTERY_2: 20,      // BLE Sensor 2 Battery Level (%)
  BLE_BATTERY_3: 22,      // BLE Sensor 3 Battery Level (%)
  BLE_BATTERY_4: 23,      // BLE Sensor 4 Battery Level (%)

  // Alarm & Security Events
  PANIC_BUTTON_SOS: 236,  // Panic Button / SOS Alarm
  CRASH_EVENT: 247,       // Crash detection event (1=Crash trace, 2=Crash event)
  CRASH_TRACE: 248,       // Crash trace data
  TOWING_DETECTION: 246,  // Towing alarm (1=Towing started)
  UNPLUG_DETECTION: 252,  // Device unplugged / Power cut / OBD unplug alarm
  JAMMING_DETECTION: 249, // GSM Jamming detection
  EXCESSIVE_IDLING: 251,  // Excessive idling alarm
  GEOFENCE_EVENT: 155,    // Auto-geofence enter/exit
} as const;

export function getAvlIoName(id: number): string {
  const entry = Object.entries(TELTONIKA_AVL_IDS).find(([, val]) => val === id);
  return entry ? entry[0] : `IO_${id}`;
}

export function isTeltonikaAlarmEvent(eventIoId: number): { isAlarm: boolean; type: string; label: string } {
  switch (eventIoId) {
    case TELTONIKA_AVL_IDS.PANIC_BUTTON_SOS:
      return { isAlarm: true, type: 'sos', label: 'Tombol Darurat SOS Ditekan' };
    case TELTONIKA_AVL_IDS.CRASH_EVENT:
      return { isAlarm: true, type: 'crash', label: 'Benturan / Tabrakan Terdeteksi' };
    case TELTONIKA_AVL_IDS.TOWING_DETECTION:
      return { isAlarm: true, type: 'towing', label: 'Kendaraan Diderek / Towing' };
    case TELTONIKA_AVL_IDS.UNPLUG_DETECTION:
      return { isAlarm: true, type: 'unplugged', label: 'Perangkat Dicabut dari Soket Port OBD / Aki Kendaraan' };
    case TELTONIKA_AVL_IDS.OBD_DTC_COUNT:
      return { isAlarm: true, type: 'obd_dtc', label: 'Kode Kerusakan Mesin (DTC) Terdeteksi via OBD-II' };
    case TELTONIKA_AVL_IDS.JAMMING_DETECTION:
      return { isAlarm: true, type: 'jamming', label: 'Sinyal GSM Terganggu / Jamming' };
    case TELTONIKA_AVL_IDS.OVER_SPEEDING:
      return { isAlarm: true, type: 'overspeed', label: 'Batas Kecepatan Terlampaui (Over-speeding)' };
    case TELTONIKA_AVL_IDS.EXCESSIVE_IDLING:
      return { isAlarm: true, type: 'idling', label: 'Mesin Menyala Tanpa Berjalan Terlalu Lama (Excessive Idling)' };
    default:
      return { isAlarm: false, type: 'info', label: 'Status Normal' };
  }
}
