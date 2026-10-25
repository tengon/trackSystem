import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    const device = await db.device.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
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

    // Role-based protection: Regular user cannot view device not assigned to them
    if (currentUserRole === 'user' && device.userId !== currentUserId) {
      return NextResponse.json(
        { error: 'Akses ditolak. Perangkat ini bukan milik atau ditugaskan kepada Anda.' },
        { status: 403 }
      );
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
    const searchParams = request.nextUrl.searchParams;
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    // Only Superuser or Admin can edit devices
    if (currentUserRole === 'user') {
      return NextResponse.json(
        { error: 'Hanya Superuser atau Admin yang dapat mengubah data perangkat' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, model, type, status, iconColor, phoneNumber, imei, notes, userId } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (model !== undefined) updateData.model = model;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (iconColor !== undefined) updateData.iconColor = iconColor;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (imei !== undefined) updateData.imei = imei || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (userId !== undefined) updateData.userId = userId || null;

    const device = await db.device.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
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
    const searchParams = request.nextUrl.searchParams;
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    // Only Superuser or Admin can delete devices
    if (currentUserRole === 'user') {
      return NextResponse.json(
        { error: 'Hanya Superuser atau Admin yang dapat menghapus perangkat' },
        { status: 403 }
      );
    }

    await db.device.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
  }
}
