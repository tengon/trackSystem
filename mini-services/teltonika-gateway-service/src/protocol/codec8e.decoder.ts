/**
 * Teltonika Codec 8 Extended Decoder (Codec ID 0x8E - 2-byte IO IDs & Counts)
 */

import { calculateTeltonikaCRC16, RawTeltonikaPacket, RawAvlRecord } from './teltonika.protocol';
import { decodeGpsElement } from '../decoders/gps.decoder';
import { decodeIoElements } from '../decoders/io-element.decoder';

export function decodeCodec8Extended(buffer: Buffer): RawTeltonikaPacket | null {
  if (buffer.length < 15) return null;

  let offset = 0;
  const preamble = buffer.readUInt32BE(offset);
  offset += 4;
  if (preamble !== 0) return null;

  const dataLength = buffer.readUInt32BE(offset);
  offset += 4;

  if (buffer.length < 8 + dataLength + 4) return null;

  const dataPayload = buffer.subarray(8, 8 + dataLength);
  const expectedCrc = buffer.readUInt32BE(8 + dataLength);
  const actualCrc = calculateTeltonikaCRC16(dataPayload);

  const codecId = buffer.readUInt8(offset);
  offset += 1;
  if (codecId !== 0x8E) return null;

  const recordCount1 = buffer.readUInt8(offset);
  offset += 1;

  const records: RawAvlRecord[] = [];

  for (let r = 0; r < recordCount1; r++) {
    const timestampMs = Number(buffer.readBigInt64BE(offset));
    offset += 8;

    const priority = buffer.readUInt8(offset);
    offset += 1;

    const { gps, nextOffset: gpsNext } = decodeGpsElement(buffer, offset);
    offset = gpsNext;

    const { io, nextOffset: ioNext } = decodeIoElements(buffer, offset, true); // isExtended = true
    offset = ioNext;

    records.push({
      timestampMs,
      priority,
      ...gps,
      eventIoId: io.eventIoId,
      ioElements: io.ioElements,
    });
  }

  return {
    codecId,
    recordCount: recordCount1,
    records,
    crcValid: expectedCrc === actualCrc,
  };
}
