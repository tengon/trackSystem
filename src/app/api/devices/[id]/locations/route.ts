import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Record<string, unknown> = { deviceId: id };
    if (from || to) {
      where.timestamp = {} as Record<string, unknown>;
      if (from) (where.timestamp as Record<string, unknown>).gte = new Date(from);
      if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to);
    }

    const locations = await db.locationRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { latitude, longitude, speed, heading, altitude, batteryLevel, accuracy } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const location = await db.locationRecord.create({
      data: {
        deviceId: id,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        altitude: altitude || 0,
        batteryLevel: batteryLevel || 100,
        accuracy: accuracy || 0,
      },
    });

    // Update device's last known location
    await db.device.update({
      where: { id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastSpeed: speed || 0,
        lastHeading: heading || 0,
        batteryLevel: batteryLevel || 100,
        status: speed > 2 ? 'online' : 'idle',
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
