import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [totalDevices, onlineDevices, offlineDevices, idleDevices, totalAlerts, unreadAlerts, vehicleDevices, personDevices, petDevices, assetDevices] =
      await Promise.all([
        db.device.count(),
        db.device.count({ where: { status: 'online' } }),
        db.device.count({ where: { status: 'offline' } }),
        db.device.count({ where: { status: 'idle' } }),
        db.alert.count(),
        db.alert.count({ where: { read: false } }),
        db.device.count({ where: { type: 'vehicle' } }),
        db.device.count({ where: { type: 'person' } }),
        db.device.count({ where: { type: 'pet' } }),
        db.device.count({ where: { type: 'asset' } }),
      ]);

    const devicesByType = { vehicle: vehicleDevices, person: personDevices, pet: petDevices, asset: assetDevices };

    const recentAlerts = await db.alert.findMany({
      where: { read: false },
      include: { device: { select: { name: true, type: true, iconColor: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get average speed of online vehicles
    const onlineVehicles = await db.device.findMany({
      where: { status: 'online', type: 'vehicle' },
      select: { lastSpeed: true },
    });
    const avgSpeed = onlineVehicles.length > 0
      ? onlineVehicles.reduce((sum, d) => sum + d.lastSpeed, 0) / onlineVehicles.length
      : 0;

    return NextResponse.json({
      totalDevices,
      onlineDevices,
      offlineDevices,
      idleDevices,
      totalAlerts,
      unreadAlerts,
      devicesByType,
      recentAlerts,
      avgSpeed: Math.round(avgSpeed),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
