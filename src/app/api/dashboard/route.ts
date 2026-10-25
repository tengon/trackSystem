import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    // Filter scoped by user role
    const deviceScope: Record<string, unknown> = {};
    const alertScope: Record<string, unknown> = {};

    if (currentUserRole === 'user') {
      if (!currentUserId) {
        return NextResponse.json({
          totalDevices: 0,
          onlineDevices: 0,
          offlineDevices: 0,
          idleDevices: 0,
          totalAlerts: 0,
          unreadAlerts: 0,
          devicesByType: { vehicle: 0, person: 0, pet: 0, asset: 0 },
          recentAlerts: [],
          avgSpeed: 0,
        });
      }
      deviceScope.userId = currentUserId;
      alertScope.device = { userId: currentUserId };
    }

    const [
      totalDevices,
      onlineDevices,
      offlineDevices,
      idleDevices,
      totalAlerts,
      unreadAlerts,
      vehicleDevices,
      personDevices,
      petDevices,
      assetDevices,
    ] = await Promise.all([
      db.device.count({ where: deviceScope }),
      db.device.count({ where: { ...deviceScope, status: 'online' } }),
      db.device.count({ where: { ...deviceScope, status: 'offline' } }),
      db.device.count({ where: { ...deviceScope, status: 'idle' } }),
      db.alert.count({ where: alertScope }),
      db.alert.count({ where: { ...alertScope, read: false } }),
      db.device.count({ where: { ...deviceScope, type: 'vehicle' } }),
      db.device.count({ where: { ...deviceScope, type: 'person' } }),
      db.device.count({ where: { ...deviceScope, type: 'pet' } }),
      db.device.count({ where: { ...deviceScope, type: 'asset' } }),
    ]);

    const devicesByType = {
      vehicle: vehicleDevices,
      person: personDevices,
      pet: petDevices,
      asset: assetDevices,
    };

    const recentAlerts = await db.alert.findMany({
      where: { ...alertScope, read: false },
      include: { device: { select: { name: true, type: true, iconColor: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get average speed of online vehicles
    const onlineVehicles = await db.device.findMany({
      where: { ...deviceScope, status: 'online', type: 'vehicle' },
      select: { lastSpeed: true },
    });
    const avgSpeed =
      onlineVehicles.length > 0
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
