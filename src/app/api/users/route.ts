import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    const users = await db.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Nama, email, dan kata sandi wajib diisi' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email sudah terdaftar' },
        { status: 409 }
      )
    }

    const hashedPassword = hashPassword(password)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role ?? 'user',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, role, active, password } = body

    if (!id) {
      return NextResponse.json(
        { message: 'ID pengguna wajib diisi' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) {
      if (email !== existingUser.email) {
        const emailTaken = await db.user.findUnique({ where: { email } })
        if (emailTaken) {
          return NextResponse.json(
            { message: 'Email sudah terdaftar' },
            { status: 409 }
          )
        }
      }
      data.email = email
    }
    if (role !== undefined) data.role = role
    if (active !== undefined) data.active = active
    if (password !== undefined && password !== '') {
      data.password = hashPassword(password)
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'ID pengguna wajib diisi' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ message: 'Pengguna berhasil dihapus' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
