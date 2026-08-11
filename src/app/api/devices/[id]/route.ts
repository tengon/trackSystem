import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const device = await db.device.findUnique({
      where: { id },
      include: {
        geofences: true,
        _count: {
          select: {
            locations: true,
            alerts: { where: { read: false } },
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, status, iconColor, phoneNumber, imei, notes } = body;

    const device = await db.device.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(status && { status }),
        ...(iconColor && { iconColor }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
        ...(imei !== undefined && { imei: imei || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.device.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
  }
}
