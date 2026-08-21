/**
 * Teltonika AVL ID Definitions & Mapping Table
 * Maps Teltonika IO IDs across all hardware series (FMB, FMC, FMM, RUT, TMT, TST, TFT)
 */

export const TELTONIKA_AVL_IDS = {
  // Standard Digital Inputs / Outputs
  IGNITION: 239,       // DIN1 / Ignition (1=ON, 0=OFF)
  MOVEMENT: 240,       // Movement sensor (1=Moving, 0=Stopped)
  DIN1: 1,
  DIN2: 2,
  DIN3: 3,
  DIN4: 4,
  DOUT1: 179,
  DOUT2: 180,

  // Power & Battery Telemetry
  EXTERNAL_VOLTAGE: 66,   // External Power Supply Voltage in mV (e.g. 12400 = 12.4V)
  BATTERY_VOLTAGE: 67,    // Backup Battery Voltage in mV
  BATTERY_PERCENT: 113,   // Internal Battery level in %

  // Network & System
  GSM_SIGNAL: 21,         // GSM Signal Level (1..5)
  GNSS_STATUS: 69,        // GNSS Status (0=OFF, 1=ON without fix, 2=ON with fix)
  PDOP: 181,
  HDOP: 182,

  // Speed & Distance
  SPEED: 24,              // Speed in km/h
  ODOMETER: 87,           // Total Odometer in meters
  TRIP_ODOMETER: 16,      // Trip distance in meters

  // CAN-bus & OBDII Telemetry
  CAN_RPM: 85,            // Engine RPM
  CAN_ENGINE_TEMP: 115,   // Engine Temperature in °C
  CAN_FUEL_LEVEL: 84,     // Fuel level percentage (0..100%)
  CAN_FUEL_CONSUMED: 83,  // Total fuel consumed in liters
  CAN_ACCELERATOR: 114,   // Accelerator pedal position %

  // BLE (Bluetooth Low Energy) Sensors
  BLE_TEMP_1: 25,         // BLE Temperature Sensor 1 (°C x 10)
  BLE_TEMP_2: 26,         // BLE Temperature Sensor 2
  BLE_TEMP_3: 27,         // BLE Temperature Sensor 3
  BLE_TEMP_4: 28,         // BLE Temperature Sensor 4
  BLE_HUMIDITY_1: 86,     // BLE Humidity Sensor 1 (% x 10)
  BLE_BATTERY_1: 29,      // BLE Sensor 1 Battery Level (%)

  // Alarm & Crash Events
  CRASH_EVENT: 247,       // Crash detection event
  CRASH_TRACE: 248,
  TOWING_DETECTION: 246,  // Towing alarm
  UNPLUG_DETECTION: 252,  // Device unplugged alarm
  JAMMING_DETECTION: 249, // GSM Jamming detection
} as const;

export function getAvlIoName(id: number): string {
  const entry = Object.entries(TELTONIKA_AVL_IDS).find(([, val]) => val === id);
  return entry ? entry[0] : `IO_${id}`;
}
