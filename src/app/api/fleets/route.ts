import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const fleets = await db.fleet.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { devices: true } },
        devices: {
          select: {
            id: true, name: true, type: true, status: true, iconColor: true,
            lastLatitude: true, lastLongitude: true, lastSpeed: true, batteryLevel: true,
          },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    return NextResponse.json(fleets);
  } catch (error) {
    console.error('Error fetching fleets:', error);
    return NextResponse.json({ error: 'Failed to fetch fleets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, deviceIds } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nama armada wajib diisi' }, { status: 400 });
    }

    const fleet = await db.fleet.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || '#22c55e',
        devices: deviceIds?.length
          ? { connect: deviceIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        _count: { select: { devices: true } },
      },
    });

    return NextResponse.json(fleet, { status: 201 });
  } catch (error) {
    console.error('Error creating fleet:', error);
    return NextResponse.json({ error: 'Failed to create fleet' }, { status: 500 });
  }
}
