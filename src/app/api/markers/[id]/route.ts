import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, description, latitude, longitude, color, icon } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (latitude !== undefined) data.latitude = parseFloat(latitude);
    if (longitude !== undefined) data.longitude = parseFloat(longitude);
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;

    const updated = await db.mapMarker.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating map marker:', error);
    return NextResponse.json({ error: 'Gagal memperbarui penanda peta' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.mapMarker.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Penanda berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting map marker:', error);
    return NextResponse.json({ error: 'Gagal menghapus penanda peta' }, { status: 500 });
  }
}
