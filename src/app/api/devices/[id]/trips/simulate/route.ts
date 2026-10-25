import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const WAYPOINTS = [
  { lat: -6.1050, lng: 106.8830, name: 'Pelabuhan Tanjung Priok' },
  { lat: -6.1210, lng: 106.8870, name: 'Jl. Yos Sudarso' },
  { lat: -6.1390, lng: 106.8890, name: 'Sunter Artha Gading' },
  { lat: -6.1550, lng: 106.8790, name: 'Kelapa Gading Barat' },
  { lat: -6.1720, lng: 106.8650, name: 'Cempaka Putih Interchange' },
  { lat: -6.1850, lng: 106.8520, name: 'Senen Raya' },
  { lat: -6.1920, lng: 106.8390, name: 'Tugu Tani / Kebon Sirih' },
  { lat: -6.1950, lng: 106.8230, name: 'Bundaran HI / Thamrin' },
  { lat: -6.2088, lng: 106.8210, name: 'Dukuh Atas / Sudirman' },
  { lat: -6.2220, lng: 106.8150, name: 'Semanggi Interchange' },
  { lat: -6.2250, lng: 106.8040, name: 'Senayan City / GBK' },
];

function interpolate(p1: typeof WAYPOINTS[0], p2: typeof WAYPOINTS[0], count: number) {
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    points.push({
      lat: p1.lat + (p2.lat - p1.lat) * t,
      lng: p1.lng + (p2.lng - p1.lng) * t,
    });
  }
  return points;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deviceId } = await params;

    const device = await db.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const allRoutePoints: { lat: number; lng: number }[] = [];
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const interpolated = interpolate(WAYPOINTS[i], WAYPOINTS[i + 1], 4);
      allRoutePoints.push(...interpolated.slice(0, -1));
    }
    allRoutePoints.push(WAYPOINTS[WAYPOINTS.length - 1]);

    const now = new Date();
    let currentTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0).getTime();
    let battery = 98;

    const records: Array<{
      deviceId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      altitude: number;
      batteryLevel: number;
      accuracy: number;
      timestamp: Date;
    }> = [];
    for (let i = 0; i < allRoutePoints.length; i++) {
      const pt = allRoutePoints[i];
      const isStopped = i === 12 || i === 25;
      const speed = isStopped ? 0 : 38 + Math.random() * 22;
      const heading = (i * 15) % 360;
      battery = Math.max(70, battery - 0.5);

      currentTime += (isStopped ? 8 : 2 + Math.random() * 2) * 60 * 1000;

      records.push({
        deviceId,
        latitude: pt.lat,
        longitude: pt.lng,
        speed: Math.round(speed * 10) / 10,
        heading: Math.round(heading),
        altitude: 18 + Math.round(Math.random() * 8),
        batteryLevel: Math.round(battery),
        accuracy: 3.5,
        timestamp: new Date(currentTime),
      });
    }

    // Insert records
    await db.locationRecord.createMany({
      data: records,
    });

    // Update device latest position
    const lastRecord = records[records.length - 1];
    await db.device.update({
      where: { id: deviceId },
      data: {
        lastLatitude: lastRecord.latitude,
        lastLongitude: lastRecord.longitude,
        lastSpeed: lastRecord.speed,
        lastHeading: lastRecord.heading,
        batteryLevel: lastRecord.batteryLevel,
        status: lastRecord.speed > 2 ? 'online' : 'idle',
      },
    });

    return NextResponse.json({
      success: true,
      count: records.length,
      message: `Berhasil membuat ${records.length} titik simulasi rute perjalanan.`,
    });
  } catch (error) {
    console.error('Error generating simulated trip route:', error);
    return NextResponse.json({ error: 'Failed to simulate trip route' }, { status: 500 });
  }
}
