/**
 * Teltonika Gateway TCP Server
 */

import net from 'node:net';
import { Server as SocketServer } from 'socket.io';
import { parseImeiHandshake, RawTeltonikaPacket } from '../protocol/teltonika.protocol';
import { decodeCodec8 } from '../protocol/codec8.decoder';
import { decodeCodec8Extended } from '../protocol/codec8e.decoder';
import { decodeCodec16 } from '../protocol/codec16.decoder';
import { normalizeTelemetryRecord } from '../normalizers/telemetry.normalizer';
import { deviceService, ResolvedDevice } from '../services/device.service';
import { telemetryService } from '../services/telemetry.service';

export function createTeltonikaTcpServer(ioServer: SocketServer): net.Server {
  return net.createServer((socket) => {
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[Teltonika TCP] New device connection from ${clientAddr}`);

    let authenticatedDevice: ResolvedDevice | null = null;

    socket.on('data', async (data: Buffer) => {
      try {
        // 1. Handshake Phase: IMEI Authentication
        if (!authenticatedDevice) {
          const imei = parseImeiHandshake(data);
          if (imei && imei.length >= 10 && imei.length <= 18) {
            authenticatedDevice = await deviceService.resolveOrCreateDevice(imei);
            console.log(`[Teltonika TCP] IMEI ${imei} authenticated (${authenticatedDevice.name})`);

            // Accept response: 1 byte 0x01
            socket.write(Buffer.from([0x01]));
            return;
          } else {
            console.warn(`[Teltonika TCP] Invalid IMEI handshake from ${clientAddr}`);
            socket.write(Buffer.from([0x00]));
            socket.destroy();
            return;
          }
        }

        // 2. Data Phase: Codec Detection & Decoding
        if (data.length < 15) return;

        // Detect Codec ID at byte offset 8
        const codecId = data.readUInt8(8);
        let packet: RawTeltonikaPacket | null = null;

        if (codecId === 0x08) {
          packet = decodeCodec8(data);
        } else if (codecId === 0x8E) {
          packet = decodeCodec8Extended(data);
        } else if (codecId === 0x10) {
          packet = decodeCodec16(data);
        } else {
          console.warn(`[Teltonika TCP] Unknown Codec ID 0x${codecId.toString(16)} from IMEI ${authenticatedDevice.imei}`);
          return;
        }

        if (!packet || !packet.crcValid) {
          console.warn(`[Teltonika TCP] Corrupted packet or invalid CRC from IMEI ${authenticatedDevice.imei}`);
          return;
        }

        console.log(`[Teltonika TCP] Codec 0x${codecId.toString(16)} packet decoded from ${authenticatedDevice.name}: ${packet.recordCount} records`);

        // 3. Normalization & Persistence Pipeline
        for (const record of packet.records) {
          const normalized = normalizeTelemetryRecord(record);
          await telemetryService.processTelemetry(authenticatedDevice, normalized, ioServer);
        }

        // 4. ACK Response: 4-byte big-endian integer count of accepted records
        const ackResponse = Buffer.alloc(4);
        ackResponse.writeUInt32BE(packet.recordCount, 0);
        socket.write(ackResponse);

      } catch (err: any) {
        console.error(`[Teltonika TCP] Error processing packet from ${clientAddr}:`, err.message);
      }
    });

    socket.on('error', (err) => {
      console.error(`[Teltonika TCP] Socket error (${clientAddr}):`, err.message);
    });

    socket.on('close', () => {
      console.log(`[Teltonika TCP] Connection closed (${clientAddr})`);
    });
  });
}
