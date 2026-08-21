/**
 * Teltonika Protocol Common Specs & CRC-16 Verification
 */

export interface RawAvlRecord {
  timestampMs: number;
  priority: number;
  latitude: number;
  longitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventIoId: number;
  ioElements: Record<number, number | bigint>;
}

export interface RawTeltonikaPacket {
  codecId: number;
  recordCount: number;
  records: RawAvlRecord[];
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
 * Parses IMEI Handshake payload
 * Supports both standard 2-byte length prefixed IMEI and direct ASCII IMEI strings
 */
export function parseImeiHandshake(buffer: Buffer): string | null {
  if (buffer.length < 10) return null;

  // Format 1: Standard Teltonika 2-byte length prefix
  const length = buffer.readUInt16BE(0);
  if (length >= 10 && length <= 18 && buffer.length >= 2 + length) {
    const imei = buffer.toString('ascii', 2, 2 + length).trim();
    if (/^\d{10,18}$/.test(imei)) {
      return imei;
    }
  }

  // Format 2: Direct ASCII IMEI string fallback
  const directStr = buffer.toString('ascii').trim();
  const match = directStr.match(/\d{10,18}/);
  if (match) {
    return match[0];
  }

  return null;
}
