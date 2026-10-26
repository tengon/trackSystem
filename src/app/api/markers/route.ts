import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    const where: Record<string, unknown> = {};

    // Regular users can see markers created by them or public/shared markers
    if (currentUserRole === 'user' && currentUserId) {
      where.OR = [
        { userId: currentUserId },
        { userId: null },
      ];
    }

    const markers = await db.mapMarker.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(markers);
  } catch (error) {
    console.error('Error fetching map markers:', error);
    return NextResponse.json({ error: 'Failed to fetch markers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id') || null;

    const body = await request.json();
    const { name, category, description, latitude, longitude, color, icon } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Nama, latitude, dan longitude wajib diisi' }, { status: 400 });
    }

    let validUserId: string | null = null;
    if (currentUserId) {
      const existingUser = await db.user.findUnique({
        where: { id: currentUserId },
        select: { id: true },
      });
      if (existingUser) {
        validUserId = existingUser.id;
      }
    }

    const marker = await db.mapMarker.create({
      data: {
        name: name.trim(),
        category: category || 'location',
        description: description?.trim() || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        color: color || '#0ea5e9',
        icon: icon || '📍',
        userId: validUserId,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(marker, { status: 201 });
  } catch (error) {
    console.error('Error creating map marker:', error);
    return NextResponse.json({ error: 'Gagal menyimpan penanda peta' }, { status: 500 });
  }
}
