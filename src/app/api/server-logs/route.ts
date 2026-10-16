import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200);
    const deviceId = searchParams.get('deviceId');

    const where: Record<string, unknown> = {};
    if (deviceId && deviceId !== 'all') {
      where.deviceId = deviceId;
    }

    const [records, totalCount, activeDevices] = await Promise.all([
      db.locationRecord.findMany({
        where,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              imei: true,
              type: true,
              status: true,
              iconColor: true,
            },
          },
        },
      }),
      db.locationRecord.count(),
      db.device.findMany({
        select: {
          id: true,
          name: true,
          imei: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      records,
      stats: {
        totalRecords: totalCount,
        activeDevicesCount: activeDevices.filter((d) => d.status === 'online').length,
        totalDevices: activeDevices.length,
        latestTimestamp: records[0]?.timestamp || null,
      },
    });
  } catch (error) {
    console.error('Error fetching server logs:', error);
    return NextResponse.json({ error: 'Failed to fetch server logs' }, { status: 500 });
  }
}
