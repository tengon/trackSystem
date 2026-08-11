import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const geofence = await db.geofence.findUnique({
      where: { id },
      include: { device: true },
    });

    if (!geofence) {
      return NextResponse.json({ error: 'Geofence not found' }, { status: 404 });
    }

    return NextResponse.json(geofence);
  } catch (error) {
    console.error('Error fetching geofence:', error);
    return NextResponse.json({ error: 'Failed to fetch geofence' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, radius, type, active } = body;

    const geofence = await db.geofence.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(radius !== undefined && { radius }),
        ...(type && { type }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(geofence);
  } catch (error) {
    console.error('Error updating geofence:', error);
    return NextResponse.json({ error: 'Failed to update geofence' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.geofence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    return NextResponse.json({ error: 'Failed to delete geofence' }, { status: 500 });
  }
}
