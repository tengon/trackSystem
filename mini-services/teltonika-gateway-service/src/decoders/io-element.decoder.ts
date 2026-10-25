/**
 * Teltonika IO Element Decoder (1, 2, 4, 8 and Variable X-Byte IO Elements)
 * Compliant with Teltonika Codec 8, Codec 8 Extended (0x8E), and Codec 16 (0x10)
 */

export interface DecodedIoElement {
  eventIoId: number;
  totalIoCount: number;
  ioElements: Record<number, number | bigint>;
  variableIoElements?: Record<number, string>; // hex string of variable payload
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
  const variableIoElements: Record<number, string> = {};

  // 1-Byte IOs
  const count1B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count1B && curr + 1 <= buffer.length; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readUInt8(curr);
    curr += 1;
    ioElements[id] = val;
  }

  // 2-Byte IOs
  const count2B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count2B && curr + 2 <= buffer.length; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readUInt16BE(curr);
    curr += 2;
    ioElements[id] = val;
  }

  // 4-Byte IOs
  const count4B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count4B && curr + 4 <= buffer.length; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readUInt32BE(curr);
    curr += 4;
    ioElements[id] = val;
  }

  // 8-Byte IOs
  const count8B = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
  curr += isExtended ? 2 : 1;
  for (let i = 0; i < count8B && curr + 8 <= buffer.length; i++) {
    const id = isExtended ? buffer.readUInt16BE(curr) : buffer.readUInt8(curr);
    curr += isExtended ? 2 : 1;
    const val = buffer.readBigInt64BE(curr);
    curr += 8;
    ioElements[id] = val;
  }

  // X-Byte (Variable Length) IOs (Standard in Codec 8 Extended & Codec 16)
  if (isExtended && curr + 2 <= buffer.length) {
    const countXB = buffer.readUInt16BE(curr);
    curr += 2;
    for (let i = 0; i < countXB && curr + 4 <= buffer.length; i++) {
      const id = buffer.readUInt16BE(curr);
      curr += 2;
      const length = buffer.readUInt16BE(curr);
      curr += 2;
      if (curr + length <= buffer.length) {
        const rawBytes = buffer.subarray(curr, curr + length);
        variableIoElements[id] = rawBytes.toString('hex');

        // If numeric value fits standard sizes, populate in ioElements as well
        if (length === 1) {
          ioElements[id] = rawBytes.readUInt8(0);
        } else if (length === 2) {
          ioElements[id] = rawBytes.readUInt16BE(0);
        } else if (length === 4) {
          ioElements[id] = rawBytes.readUInt32BE(0);
        } else if (length === 8) {
          ioElements[id] = rawBytes.readBigInt64BE(0);
        }

        curr += length;
      }
    }
  }

  return {
    io: { eventIoId, totalIoCount, ioElements, variableIoElements },
    nextOffset: curr,
  };
}
