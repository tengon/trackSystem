import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fleet = await db.fleet.findUnique({
      where: { id },
      include: {
        _count: { select: { devices: true } },
        devices: {
          select: {
            id: true, name: true, type: true, status: true, iconColor: true,
            lastLatitude: true, lastLongitude: true, lastSpeed: true, batteryLevel: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!fleet) {
      return NextResponse.json({ error: 'Armada tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(fleet);
  } catch (error) {
    console.error('Error fetching fleet:', error);
    return NextResponse.json({ error: 'Failed to fetch fleet' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, color, deviceIds } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (color !== undefined) updateData.color = color;

    const fleet = await db.fleet.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { devices: true } } },
    });

    // Sync devices if deviceIds provided
    if (deviceIds !== undefined) {
      await db.device.updateMany({
        where: { fleetId: id },
        data: { fleetId: null },
      });
      if (deviceIds.length > 0) {
        await db.device.updateMany({
          where: { id: { in: deviceIds } },
          data: { fleetId: id },
        });
      }
    }

    return NextResponse.json(fleet);
  } catch (error) {
    console.error('Error updating fleet:', error);
    return NextResponse.json({ error: 'Failed to update fleet' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Unlink devices first
    await db.device.updateMany({
      where: { fleetId: id },
      data: { fleetId: null },
    });
    await db.fleet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fleet:', error);
    return NextResponse.json({ error: 'Failed to delete fleet' }, { status: 500 });
  }
}
