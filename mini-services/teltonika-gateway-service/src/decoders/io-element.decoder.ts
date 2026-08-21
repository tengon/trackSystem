/**
 * Teltonika IO Element Decoder (1, 2, 4, 8 Byte IO Elements)
 */

export interface DecodedIoElement {
  eventIoId: number;
  ioElements: Record<number, number | bigint>;
}

export function decodeIoElements(
  buffer: Buffer,
  offset: number,
  isExtended: boolean
): { io: DecodedIoElement; nextOffset: number } {
  let curr = offset;

  const eventIoId = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;

  const totalIoCount = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;

  const ioElements: Record<number, number | bigint> = {};

  // 1-Byte IOs
  const count1B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count1B; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readUInt8(curr);
    curr += 1;
    ioElements[id] = val;
  }

  // 2-Byte IOs
  const count2B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count2B; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readUInt16BE(curr);
    curr += 2;
    ioElements[id] = val;
  }

  // 4-Byte IOs
  const count4B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count4B; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readUInt32BE(curr);
    curr += 4;
    ioElements[id] = val;
  }

  // 8-Byte IOs
  const count8B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count8B; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readBigInt64BE(curr);
    curr += 8;
    ioElements[id] = val;
  }

  return {
    io: { eventIoId, ioElements },
    nextOffset: curr,
  };
}
