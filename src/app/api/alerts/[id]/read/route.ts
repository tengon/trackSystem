import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    if (currentUserRole === 'user' && currentUserId) {
      const existing = await db.alert.findUnique({
        where: { id },
        include: { device: { select: { userId: true } } },
      });
      if (!existing || existing.device.userId !== currentUserId) {
        return NextResponse.json({ error: 'Alert not found or access denied' }, { status: 403 });
      }
    }

    const alert = await db.alert.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    // Mark all as read scoped to user's assigned devices if role is user
    if (currentUserRole === 'user' && currentUserId) {
      await db.alert.updateMany({
        where: {
          read: false,
          device: { userId: currentUserId },
        },
        data: { read: true },
      });
    } else {
      await db.alert.updateMany({ where: { read: false }, data: { read: true } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return NextResponse.json({ error: 'Failed to mark alerts as read' }, { status: 500 });
  }
}
