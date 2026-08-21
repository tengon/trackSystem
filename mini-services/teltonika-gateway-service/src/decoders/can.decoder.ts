/**
 * Teltonika CAN-bus & OBDII Telemetry Decoder
 */

import { TELTONIKA_AVL_IDS } from '../mappings/avl-id.mapping';

export interface DecodedCanTelemetry {
  rpm?: number;
  engineTemperature?: number;
  fuelLevelPercent?: number;
  fuelConsumedLiters?: number;
  acceleratorPedalPercent?: number;
}

export function decodeCanTelemetry(ioElements: Record<number, number | bigint>): DecodedCanTelemetry {
  const canData: DecodedCanTelemetry = {};

  if (ioElements[TELTONIKA_AVL_IDS.CAN_RPM] !== undefined) {
    canData.rpm = Number(ioElements[TELTONIKA_AVL_IDS.CAN_RPM]);
  }

  if (ioElements[TELTONIKA_AVL_IDS.CAN_ENGINE_TEMP] !== undefined) {
    canData.engineTemperature = Number(ioElements[TELTONIKA_AVL_IDS.CAN_ENGINE_TEMP]);
  }

  if (ioElements[TELTONIKA_AVL_IDS.CAN_FUEL_LEVEL] !== undefined) {
    canData.fuelLevelPercent = Number(ioElements[TELTONIKA_AVL_IDS.CAN_FUEL_LEVEL]);
  }

  if (ioElements[TELTONIKA_AVL_IDS.CAN_FUEL_CONSUMED] !== undefined) {
    canData.fuelConsumedLiters = Number(ioElements[TELTONIKA_AVL_IDS.CAN_FUEL_CONSUMED]) / 10;
  }

  if (ioElements[TELTONIKA_AVL_IDS.CAN_ACCELERATOR] !== undefined) {
    canData.acceleratorPedalPercent = Number(ioElements[TELTONIKA_AVL_IDS.CAN_ACCELERATOR]);
  }

  return canData;
}
