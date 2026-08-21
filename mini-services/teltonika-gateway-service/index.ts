import net from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { decodeImei, decodeTeltonikaPacket, TeltonikaGpsData } from './src/teltonika-decoder';

const db = new PrismaClient();

const TCP_PORT = Number(process.env.TELTONIKA_TCP_PORT || 5027);
const HTTP_PORT = Number(process.env.PORT || 3002);

// Setup HTTP & Socket.IO server for realtime broadcast
const httpServer = createHttpServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'teltonika-gateway-service', tcpPort: TCP_PORT }));
});

const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('[Teltonika Gateway] Client connected to WebSocket:', socket.id);
});

// Map connected socket to device IMEI
interface DeviceSession {
  imei: string | null;
  deviceId: string | null;
  authenticated: boolean;
}

// Start TCP Gateway Server for Teltonika Devices
const tcpServer = net.createServer((socket) => {
  const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[Teltonika TCP] Device connected from ${clientAddr}`);

  const session: DeviceSession = {
    imei: null,
    deviceId: null,
    authenticated: false,
  };

  socket.on('data', async (data: Buffer) => {
    try {
      // 1. Handshake Phase: Device sends IMEI
      if (!session.authenticated) {
        const imei = decodeImei(data);
        if (imei && imei.length >= 10 && imei.length <= 18) {
          session.imei = imei;
          session.authenticated = true;

          // Find or auto-register device in database
          let device = await db.device.findFirst({
            where: { imei: imei },
          });

          if (!device) {
            console.log(`[Teltonika TCP] Registering new Teltonika device with IMEI: ${imei}`);
            device = await db.device.create({
              data: {
                name: `Teltonika GPS (${imei.slice(-6)})`,
                type: 'vehicle',
                status: 'online',
                iconColor: '#3b82f6',
                imei: imei,
                batteryLevel: 100,
                notes: 'Auto-registered by Teltonika Gateway Service',
              },
            });
          }

          session.deviceId = device.id;
          console.log(`[Teltonika TCP] Device IMEI ${imei} authenticated. Assigned DB ID: ${device.id}`);

          // Response: 1 byte 0x01 (Accepted)
          const response = Buffer.from([0x01]);
          socket.write(response);
          return;
        } else {
          console.warn(`[Teltonika TCP] Invalid IMEI handshake payload from ${clientAddr}`);
          // Response: 1 byte 0x00 (Rejected)
          socket.write(Buffer.from([0x00]));
          socket.destroy();
          return;
        }
      }

      // 2. Data Phase: Device sends AVL Data Packet
      const packet = decodeTeltonikaPacket(data);
      if (!packet) {
        console.warn(`[Teltonika TCP] Received non-AVL payload or partial data from ${session.imei}`);
        return;
      }

      console.log(`[Teltonika TCP] Decoded packet from IMEI ${session.imei}: Codec 0x${packet.codecId.toString(16)}, ${packet.recordCount} AVL records`);

      if (session.deviceId && packet.records.length > 0) {
        for (const record of packet.records) {
          await processRecord(session.deviceId, session.imei!, record);
        }
      }

      // Response: 4 bytes big-endian integer with count of accepted AVL data records
      const response = Buffer.alloc(4);
      response.writeUInt32BE(packet.recordCount, 0);
      socket.write(response);

    } catch (err: any) {
      console.error(`[Teltonika TCP] Error processing packet from ${clientAddr}:`, err.message);
    }
  });

  socket.on('error', (err) => {
    console.error(`[Teltonika TCP] Socket error (${clientAddr}):`, err.message);
  });

  socket.on('close', () => {
    console.log(`[Teltonika TCP] Device disconnected (${clientAddr}, IMEI: ${session.imei || 'N/A'})`);
  });
});

/**
 * Process and save an AVL Data Record to Database & Broadcast via Socket.IO
 */
async function processRecord(deviceId: string, imei: string, record: TeltonikaGpsData) {
  // Determine device status
  const status = record.speed > 2 ? 'online' : 'idle';
  const batteryLevel = record.backupBatteryPercent ?? 100;

  // Update Device current location and telemetry state
  const updatedDevice = await db.device.update({
    where: { id: deviceId },
    data: {
      status,
      lastLatitude: record.latitude,
      lastLongitude: record.longitude,
      lastSpeed: record.speed,
      lastHeading: record.angle,
      batteryLevel,
      updatedAt: new Date(),
    },
  });

  // Create LocationRecord history point
  const locationRecord = await db.locationRecord.create({
    data: {
      deviceId,
      latitude: record.latitude,
      longitude: record.longitude,
      speed: record.speed,
      heading: record.angle,
      altitude: record.altitude,
      batteryLevel,
      accuracy: record.satellites > 0 ? Math.max(5, 30 - record.satellites * 2) : 20,
      timestamp: record.timestamp,
    },
  });

  // Check Panic/SOS alert or low battery alert
  if (record.priority === 2) {
    await db.alert.create({
      data: {
        deviceId,
        type: 'sos',
        message: `[TELTONIKA SOS] Tombol Darurat (Panic Button) ditekan pada IMEI ${imei}`,
        read: false,
      },
    });
  } else if (batteryLevel < 20) {
    await db.alert.create({
      data: {
        deviceId,
        type: 'low_battery',
        message: `[TELTONIKA ALERT] Baterai cadangan rendah (${batteryLevel}%) pada IMEI ${imei}`,
        read: false,
      },
    });
  }

  // Broadcast realtime update to frontend subscribers
  const payload = {
    deviceId,
    imei,
    name: updatedDevice.name,
    latitude: record.latitude,
    longitude: record.longitude,
    speed: record.speed,
    heading: record.angle,
    altitude: record.altitude,
    batteryLevel,
    ignition: record.ignition,
    movement: record.movement,
    gsmSignal: record.gsmSignal,
    odometer: record.totalOdometer,
    timestamp: record.timestamp,
  };

  io.emit('location_update', payload);
  io.emit('device_status_change', { deviceId, status, batteryLevel });

  console.log(`[Teltonika Gateway] Live location saved & emitted for ${updatedDevice.name} (${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}) @ ${record.speed} km/h`);
}

// Start TCP and HTTP Listeners
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Teltonika Universal Gateway TCP Listening on 0.0.0.0:${TCP_PORT}`);
  console.log(`📡 WebSocket Realtime Gateway Listening on 0.0.0.0:${HTTP_PORT}`);
  console.log(`=======================================================`);
});

httpServer.listen(HTTP_PORT, '0.0.0.0');
