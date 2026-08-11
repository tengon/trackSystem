import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (deviceId) where.deviceId = deviceId;
    if (unreadOnly) where.read = false;

    const alerts = await db.alert.findMany({
      where,
      include: {
        device: { select: { name: true, type: true, iconColor: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await db.alert.count({ where: { read: false } });

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
