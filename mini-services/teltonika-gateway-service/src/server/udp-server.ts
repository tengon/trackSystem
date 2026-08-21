/**
 * Teltonika Gateway UDP Server
 */

import dgram from 'node:dgram';
import { Server as SocketServer } from 'socket.io';
import { decodeCodec8 } from '../protocol/codec8.decoder';
import { decodeCodec8Extended } from '../protocol/codec8e.decoder';
import { decodeCodec16 } from '../protocol/codec16.decoder';
import { normalizeTelemetryRecord } from '../normalizers/telemetry.normalizer';
import { deviceService } from '../services/device.service';
import { telemetryService } from '../services/telemetry.service';

export function createTeltonikaUdpServer(ioServer: SocketServer): dgram.Socket {
  const udpSocket = dgram.createSocket('udp4');

  udpSocket.on('message', async (msg, rinfo) => {
    try {
      if (msg.length < 15) return;

      // Teltonika UDP header: 2B length, 2B packetId, 1B type, 1B avlId, 2B imeiLen, IMEI string...
      let offset = 0;
      const length = msg.readUInt16BE(offset);
      offset += 2;
      const packetId = msg.readUInt16BE(offset);
      offset += 2;
      const packetType = msg.readUInt8(offset);
      offset += 1;
      const avlPacketId = msg.readUInt8(offset);
      offset += 1;

      const imeiLen = msg.readUInt16BE(offset);
      offset += 2;

      const imei = msg.toString('ascii', offset, offset + imeiLen).trim();
      offset += imeiLen;

      const avlPayload = msg.subarray(offset);
      if (avlPayload.length < 15) return;

      const device = await deviceService.resolveOrCreateDevice(imei);

      // Detect Codec ID at byte 8 of payload
      const codecId = avlPayload.readUInt8(8);
      let packet = null;

      if (codecId === 0x08) {
        packet = decodeCodec8(avlPayload);
      } else if (codecId === 0x8E) {
        packet = decodeCodec8Extended(avlPayload);
      } else if (codecId === 0x10) {
        packet = decodeCodec16(avlPayload);
      }

      if (packet && packet.crcValid) {
        for (const record of packet.records) {
          const normalized = normalizeTelemetryRecord(record);
          await telemetryService.processTelemetry(device, normalized, ioServer);
        }

        // UDP ACK Response: 2B length + 2B packetId + 1B type + 1B avlId + 1B accepted count
        const ack = Buffer.alloc(7);
        ack.writeUInt16BE(5, 0);
        ack.writeUInt16BE(packetId, 2);
        ack.writeUInt8(packetType, 4);
        ack.writeUInt8(avlPacketId, 5);
        ack.writeUInt8(packet.recordCount, 6);

        udpSocket.send(ack, rinfo.port, rinfo.address);
      }

    } catch (err: any) {
      console.error(`[Teltonika UDP] Error processing message from ${rinfo.address}:${rinfo.port}:`, err.message);
    }
  });

  udpSocket.on('error', (err) => {
    console.error('[Teltonika UDP] Server error:', err.message);
  });

  return udpSocket;
}
