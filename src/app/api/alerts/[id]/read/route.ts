import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    // Mark all as read
    await db.alert.updateMany({ where: { read: false }, data: { read: true } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return NextResponse.json({ error: 'Failed to mark alerts as read' }, { status: 500 });
  }
}
