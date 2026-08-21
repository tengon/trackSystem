/**
 * Teltonika Protocol Decoder (Codec 8, Codec 8 Extended, Codec 16)
 * Supports all Teltonika GPS tracker models (FMB920, FMB120, FMC130, FMC640, RUT955, TMT250, etc.)
 */

export interface TeltonikaGpsData {
  timestamp: Date;
  priority: number; // 0=Low, 1=High, 2=Panic
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventIoId: number;
  ioElements: Record<number, number | bigint>;
  // Derived telemetry
  ignition?: boolean;
  batteryVoltage?: number;
  backupBatteryPercent?: number;
  gsmSignal?: number;
  movement?: boolean;
  totalOdometer?: number;
}

export interface TeltonikaPacket {
  codecId: number;
  recordCount: number;
  records: TeltonikaGpsData[];
  crcValid: boolean;
}

/**
 * Calculates Teltonika CRC-16 (Polynomial 0xA001)
 */
export function calculateTeltonikaCRC16(buffer: Buffer): number {
  let crc = 0x0000;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return crc & 0xFFFF;
}

/**
 * Decodes IMEI packet sent by Teltonika device upon TCP connection.
 * Format: 2 bytes IMEI length + ASCII IMEI string
 */
export function decodeImei(buffer: Buffer): string | null {
  if (buffer.length < 2) return null;
  const imeiLength = buffer.readUInt16BE(0);
  if (buffer.length < 2 + imeiLength) return null;
  return buffer.toString('ascii', 2, 2 + imeiLength).trim();
}

/**
 * Main Teltonika Data Packet Decoder
 */
export function decodeTeltonikaPacket(buffer: Buffer): TeltonikaPacket | null {
  // Minimal packet header size: 4 zeros + 4 length + 1 codecId + 1 count1 ... + 1 count2 + 4 crc = 15 bytes
  if (buffer.length < 15) return null;

  let offset = 0;

  // 1. Preamble (4 Zero Bytes)
  const preamble = buffer.readUInt32BE(offset);
  offset += 4;
  if (preamble !== 0) {
    return null; // Invalid preamble
  }

  // 2. Data Field Length
  const dataLength = buffer.readUInt32BE(offset);
  offset += 4;

  if (buffer.length < 4 + 4 + dataLength + 4) {
    return null; // Incomplete packet payload
  }

  // 3. CRC-16 Verification
  const dataPayload = buffer.subarray(8, 8 + dataLength);
  const expectedCrc = buffer.readUInt32BE(8 + dataLength);
  const actualCrc = calculateTeltonikaCRC16(dataPayload);
  const crcValid = expectedCrc === actualCrc;

  // 4. Codec ID
  const codecId = buffer.readUInt8(offset);
  offset += 1;

  if (codecId !== 0x08 && codecId !== 0x8E && codecId !== 0x10) {
    throw new Error(`Unsupported Teltonika Codec ID: 0x${codecId.toString(16)}`);
  }

  const isExtended = codecId === 0x8E; // Codec 8 Extended uses 2-byte IO IDs and 2-byte IO counts

  // 5. Record Count 1
  const recordCount1 = buffer.readUInt8(offset);
  offset += 1;

  const records: TeltonikaGpsData[] = [];

  for (let r = 0; r < recordCount1; r++) {
    // Timestamp (8 bytes, ms since epoch)
    const timestampMs = Number(buffer.readBigInt64BE(offset));
    offset += 8;
    const timestamp = new Date(timestampMs);

    // Priority
    const priority = buffer.readUInt8(offset);
    offset += 1;

    // GPS Element
    const lngRaw = buffer.readInt32BE(offset);
    offset += 4;
    const latRaw = buffer.readInt32BE(offset);
    offset += 4;

    const longitude = lngRaw / 1e7;
    const latitude = latRaw / 1e7;

    const altitude = buffer.readInt16BE(offset);
    offset += 2;
    const angle = buffer.readUInt16BE(offset);
    offset += 2;
    const satellites = buffer.readUInt8(offset);
    offset += 1;
    const speed = buffer.readUInt16BE(offset);
    offset += 2;

    // IO Element
    let eventIoId = 0;
    if (isExtended) {
      eventIoId = buffer.readUInt16BE(offset);
      offset += 2;
    } else {
      eventIoId = buffer.readUInt8(offset);
      offset += 1;
    }

    const totalIoCount = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
    offset += isExtended ? 2 : 1;

    const ioElements: Record<number, number | bigint> = {};

    // 1-Byte IOs
    const count1B = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
    offset += isExtended ? 2 : 1;
    for (let i = 0; i < count1B; i++) {
      const id = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
      offset += isExtended ? 2 : 1;
      const val = buffer.readUInt8(offset);
      offset += 1;
      ioElements[id] = val;
    }

    // 2-Byte IOs
    const count2B = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
    offset += isExtended ? 2 : 1;
    for (let i = 0; i < count2B; i++) {
      const id = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
      offset += isExtended ? 2 : 1;
      const val = buffer.readUInt16BE(offset);
      offset += 2;
      ioElements[id] = val;
    }

    // 4-Byte IOs
    const count4B = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
    offset += isExtended ? 2 : 1;
    for (let i = 0; i < count4B; i++) {
      const id = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
      offset += isExtended ? 2 : 1;
      const val = buffer.readUInt32BE(offset);
      offset += 4;
      ioElements[id] = val;
    }

    // 8-Byte IOs
    const count8B = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
    offset += isExtended ? 2 : 1;
    for (let i = 0; i < count8B; i++) {
      const id = isExtended ? buffer.readUInt16BE(offset) : buffer.readUInt8(offset);
      offset += isExtended ? 2 : 1;
      const val = buffer.readBigInt64BE(offset);
      offset += 8;
      ioElements[id] = val;
    }

    // Derived Telemetry Extraction
    // DIN1 (Ignition) -> IO 239 in Codec 8, or 1 in standard Teltonika DIN
    const ignition = ioElements[239] === 1 || ioElements[1] === 1;
    // Movement -> IO 240
    const movement = ioElements[240] === 1 || speed > 2;
    // External Battery Voltage (mV -> V) -> IO 66
    const extVoltageRaw = Number(ioElements[66] ?? 0);
    const batteryVoltage = extVoltageRaw > 0 ? extVoltageRaw / 1000 : undefined;
    // Internal Battery % -> IO 113 or derived from 67 (Backup battery mV)
    const backupVoltageRaw = Number(ioElements[67] ?? 0);
    let backupBatteryPercent: number | undefined = undefined;
    if (ioElements[113] !== undefined) {
      backupBatteryPercent = Number(ioElements[113]);
    } else if (backupVoltageRaw > 0) {
      // 3.6V to 4.2V map to 0-100%
      const v = backupVoltageRaw / 1000;
      backupBatteryPercent = Math.min(100, Math.max(0, Math.round(((v - 3.6) / 0.6) * 100)));
    }
    // GSM Signal (0-5) -> IO 21
    const gsmSignal = ioElements[21] !== undefined ? Number(ioElements[21]) : undefined;
    // Odometer (meters -> km) -> IO 87 or IO 16
    const odoMeters = Number(ioElements[87] ?? ioElements[16] ?? 0);
    const totalOdometer = odoMeters > 0 ? Math.round(odoMeters / 1000) : undefined;

    records.push({
      timestamp,
      priority,
      longitude,
      latitude,
      altitude,
      angle,
      satellites,
      speed,
      eventIoId,
      ioElements,
      ignition,
      batteryVoltage,
      backupBatteryPercent,
      gsmSignal,
      movement,
      totalOdometer,
    });
  }

  // Record Count 2 validation
  const recordCount2 = buffer.readUInt8(offset);
  if (recordCount1 !== recordCount2) {
    console.warn(`Record count mismatch: count1=${recordCount1}, count2=${recordCount2}`);
  }

  return {
    codecId,
    recordCount: recordCount1,
    records,
    crcValid,
  };
}
