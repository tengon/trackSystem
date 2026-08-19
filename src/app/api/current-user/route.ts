import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await db.user.findFirst({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Pengguna aktif tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Current user error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
