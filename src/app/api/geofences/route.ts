import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');

    const where: Record<string, unknown> = {};
    if (deviceId) where.deviceId = deviceId;

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
    const body = await request.json();
    const { name, deviceId, latitude, longitude, radius, type } = body;

    if (!name || !deviceId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, deviceId, latitude, and longitude are required' }, { status: 400 });
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
