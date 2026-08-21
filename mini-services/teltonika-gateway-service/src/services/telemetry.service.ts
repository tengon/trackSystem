/**
 * Telemetry Persistence & Alert Event Service
 */

import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { NormalizedTelemetry } from '../normalizers/telemetry.normalizer';
import { ResolvedDevice } from './device.service';

const db = new PrismaClient();

export class TelemetryService {
  /**
   * Persists normalized telemetry to DB & triggers realtime alerts / WebSocket broadcast
   */
  async processTelemetry(
    device: ResolvedDevice,
    telemetry: NormalizedTelemetry,
    ioServer: SocketServer
  ) {
    const status = telemetry.telemetry.movement ? 'online' : 'idle';
    const batteryLevel = telemetry.telemetry.backupBatteryPercent ?? 100;

    // Update current Device state
    const updatedDevice = await db.device.update({
      where: { id: device.id },
      data: {
        status,
        lastLatitude: telemetry.gps.latitude,
        lastLongitude: telemetry.gps.longitude,
        lastSpeed: telemetry.gps.speed,
        lastHeading: telemetry.gps.angle,
        batteryLevel,
        updatedAt: new Date(),
      },
    });

    // Insert LocationRecord history
    await db.locationRecord.create({
      data: {
        deviceId: device.id,
        latitude: telemetry.gps.latitude,
        longitude: telemetry.gps.longitude,
        speed: telemetry.gps.speed,
        heading: telemetry.gps.angle,
        altitude: telemetry.gps.altitude,
        batteryLevel,
        accuracy: telemetry.gps.satellites > 0 ? Math.max(5, 30 - telemetry.gps.satellites * 2) : 20,
        timestamp: telemetry.timestamp,
      },
    });

    // Check & Generate Alerts
    if (telemetry.priority === 2) {
      await db.alert.create({
        data: {
          deviceId: device.id,
          type: 'sos',
          message: `[TELTONIKA SOS] Tombol Darurat ditekan pada ${updatedDevice.name} (IMEI: ${device.imei})`,
          read: false,
        },
      });
    } else if (batteryLevel < 20) {
      await db.alert.create({
        data: {
          deviceId: device.id,
          type: 'low_battery',
          message: `[TELTONIKA ALERT] Baterai cadangan rendah (${batteryLevel}%) pada ${updatedDevice.name}`,
          read: false,
        },
      });
    }

    // Broadcast Internal Standard Format payload to frontend subscribers
    const broadcastPayload = {
      deviceId: device.id,
      imei: device.imei,
      name: updatedDevice.name,
      latitude: telemetry.gps.latitude,
      longitude: telemetry.gps.longitude,
      speed: telemetry.gps.speed,
      heading: telemetry.gps.angle,
      altitude: telemetry.gps.altitude,
      batteryLevel,
      ignition: telemetry.telemetry.ignition,
      movement: telemetry.telemetry.movement,
      gsmSignal: telemetry.telemetry.gsmSignal,
      odometer: telemetry.telemetry.totalOdometer,
      can: telemetry.can,
      ble: telemetry.ble,
      timestamp: telemetry.timestamp,
    };

    ioServer.emit('location_update', broadcastPayload);
    ioServer.emit('device_status_change', { deviceId: device.id, status, batteryLevel });

    console.log(`[TelemetryService] Telemetry saved for ${updatedDevice.name} (${telemetry.gps.latitude.toFixed(5)}, ${telemetry.gps.longitude.toFixed(5)}) @ ${telemetry.gps.speed} km/h`);
  }
}

export const telemetryService = new TelemetryService();
