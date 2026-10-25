/**
 * Teltonika Device Management Service
 */

import { PrismaClient } from '@prisma/client';
import { detectDeviceFamilyByImei } from '../mappings/device.mapping';

const db = new PrismaClient();

export interface ResolvedDevice {
  id: string;
  name: string;
  imei: string;
  model: string;
  type: string;
  status: string;
}

export class DeviceService {
  private deviceCache = new Map<string, ResolvedDevice>();

  /**
   * Resolves or auto-registers Teltonika device by IMEI
   */
  async resolveOrCreateDevice(imei: string): Promise<ResolvedDevice> {
    if (this.deviceCache.has(imei)) {
      return this.deviceCache.get(imei)!;
    }

    let device = await db.device.findFirst({
      where: { imei },
    });

    const profile = detectDeviceFamilyByImei(imei);

    if (!device) {
      console.log(`[DeviceService] Auto-registering new ${profile.family} device (IMEI: ${imei})`);

      device = await db.device.create({
        data: {
          name: profile.name,
          model: profile.family,
          type: profile.defaultType || 'vehicle',
          status: 'online',
          iconColor: profile.defaultIconColor,
          imei,
          batteryLevel: 100,
          notes: `Auto-registered ${profile.family} by Teltonika Gateway`,
        } as any,
      });
    }

    const resolved: ResolvedDevice = {
      id: device.id,
      name: device.name,
      imei: device.imei || imei,
      model: (device as any).model || profile.family,
      type: device.type,
      status: device.status,
    };

    this.deviceCache.set(imei, resolved);
    return resolved;
  }
}

export const deviceService = new DeviceService();
