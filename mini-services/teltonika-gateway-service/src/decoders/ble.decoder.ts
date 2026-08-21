/**
 * Teltonika BLE (Bluetooth Low Energy) Sensors Decoder
 */

import { TELTONIKA_AVL_IDS } from '../mappings/avl-id.mapping';

export interface DecodedBleTelemetry {
  temperaturesCelsius: (number | undefined)[];
  humidityPercent?: number;
  sensorBatteryPercent?: number;
}

export function decodeBleTelemetry(ioElements: Record<number, number | bigint>): DecodedBleTelemetry {
  const temps: (number | undefined)[] = [];

  const tempIds = [
    TELTONIKA_AVL_IDS.BLE_TEMP_1,
    TELTONIKA_AVL_IDS.BLE_TEMP_2,
    TELTONIKA_AVL_IDS.BLE_TEMP_3,
    TELTONIKA_AVL_IDS.BLE_TEMP_4,
  ];

  for (const id of tempIds) {
    if (ioElements[id] !== undefined) {
      // Teltonika BLE temp is in °C x 10 or signed short
      const raw = Number(ioElements[id]);
      temps.push(raw / 10);
    } else {
      temps.push(undefined);
    }
  }

  const humidityRaw = ioElements[TELTONIKA_AVL_IDS.BLE_HUMIDITY_1];
  const humidityPercent = humidityRaw !== undefined ? Number(humidityRaw) / 10 : undefined;

  const batteryRaw = ioElements[TELTONIKA_AVL_IDS.BLE_BATTERY_1];
  const sensorBatteryPercent = batteryRaw !== undefined ? Number(batteryRaw) : undefined;

  return {
    temperaturesCelsius: temps,
    humidityPercent,
    sensorBatteryPercent,
  };
}
