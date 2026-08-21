/**
 * Teltonika GPS Element Decoder
 */

export interface DecodedGpsElement {
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
}

export function decodeGpsElement(buffer: Buffer, offset: number): { gps: DecodedGpsElement; nextOffset: number } {
  const lngRaw = buffer.readInt32BE(offset);
  const latRaw = buffer.readInt32BE(offset + 4);
  const altitude = buffer.readInt16BE(offset + 8);
  const angle = buffer.readUInt16BE(offset + 10);
  const satellites = buffer.readUInt8(offset + 12);
  const speed = buffer.readUInt16BE(offset + 13);

  return {
    gps: {
      longitude: lngRaw / 1e7,
      latitude: latRaw / 1e7,
      altitude,
      angle,
      satellites,
      speed,
    },
    nextOffset: offset + 15, // 4+4+2+2+1+2 = 15 bytes
  };
}
