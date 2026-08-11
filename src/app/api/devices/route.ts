import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phoneNumber: { contains: search } },
        { imei: { contains: search } },
      ];
    }

    const devices = await db.device.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { alerts: { where: { read: false } } },
        },
      },
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, iconColor, phoneNumber, imei, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    const device = await db.device.create({
      data: {
        name,
        type: type || 'vehicle',
        iconColor: iconColor || '#22c55e',
        phoneNumber: phoneNumber || null,
        imei: imei || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 });
  }
}
