import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    const where: Record<string, unknown> = {};
    if (deviceId) where.deviceId = deviceId;

    if (currentUserRole === 'user') {
      if (!currentUserId) {
        return NextResponse.json([]);
      }
      where.device = { userId: currentUserId };
    }

    const geofences = await db.geofence.findMany({
      where,
      include: { device: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(geofences);
  } catch (error) {
    console.error('Error fetching geofences:', error);
    return NextResponse.json({ error: 'Failed to fetch geofences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    const body = await request.json();
    const { name, deviceId, latitude, longitude, radius, type } = body;

    if (!name || !deviceId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, deviceId, latitude, and longitude are required' }, { status: 400 });
    }

    // Check device ownership for regular user
    if (currentUserRole === 'user') {
      const dev = await db.device.findUnique({ where: { id: deviceId } });
      if (!dev || dev.userId !== currentUserId) {
        return NextResponse.json({ error: 'Anda tidak memiliki hak akses ke perangkat ini' }, { status: 403 });
      }
    }

    const geofence = await db.geofence.create({
      data: {
        name,
        deviceId,
        latitude,
        longitude,
        radius: radius || 500,
        type: type || 'both',
        active: true,
      },
    });

    return NextResponse.json(geofence, { status: 201 });
  } catch (error) {
    console.error('Error creating geofence:', error);
    return NextResponse.json({ error: 'Failed to create geofence' }, { status: 500 });
  }
}
