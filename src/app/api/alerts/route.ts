import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    const where: Record<string, unknown> = {};
    if (deviceId) where.deviceId = deviceId;
    if (unreadOnly) where.read = false;

    // Restrict regular users to alerts from devices assigned to them
    if (currentUserRole === 'user') {
      if (!currentUserId) {
        return NextResponse.json({ alerts: [], unreadCount: 0 });
      }
      where.device = { userId: currentUserId };
    }

    const alerts = await db.alert.findMany({
      where,
      include: {
        device: { select: { name: true, type: true, iconColor: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadWhere: Record<string, unknown> = { read: false };
    if (currentUserRole === 'user' && currentUserId) {
      unreadWhere.device = { userId: currentUserId };
    }
    const unreadCount = await db.alert.count({ where: unreadWhere });

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
