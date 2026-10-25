import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');

    // Current requesting user context
    const currentUserId = searchParams.get('currentUserId') || request.headers.get('x-user-id');
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    // Role-based device visibility:
    // Regular users can ONLY see devices explicitly assigned to them (userId === currentUserId).
    // If not assigned any devices, they see empty list.
    // Superuser & Admin own all devices by default and see all devices.
    if (currentUserRole === 'user') {
      if (!currentUserId) {
        return NextResponse.json([]);
      }
      where.userId = currentUserId;
    } else if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phoneNumber: { contains: search } },
        { imei: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const devices = await db.device.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
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
    const searchParams = request.nextUrl.searchParams;
    const currentUserRole = searchParams.get('currentUserRole') || request.headers.get('x-user-role');

    // Only Superuser or Admin can add devices
    if (currentUserRole === 'user') {
      return NextResponse.json(
        { error: 'Hanya Superuser atau Admin yang memiliki hak menambah perangkat' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, model, type, iconColor, phoneNumber, imei, notes, userId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    // By default, if userId is null, device belongs to Superuser / Admin
    const device = await db.device.create({
      data: {
        name,
        model: model || 'FMC920',
        type: type || 'vehicle',
        iconColor: iconColor || '#22c55e',
        phoneNumber: phoneNumber || null,
        imei: imei || null,
        notes: notes || null,
        userId: userId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 });
  }
}
