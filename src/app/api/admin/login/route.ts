export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function POST(req: NextRequest) {
  try {
    const { user, pass } = await req.json()

    const validUser = process.env.ADMIN_USER || 'superadmin'
    const validPass = process.env.ADMIN_PASS || 'SushiAdmin2024!'
    const secret = process.env.ADMIN_JWT_SECRET || 'fallback-secret'

    if (user !== validUser || pass !== validPass) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode(secret))

    const res = NextResponse.json({ ok: true })
    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_token')
  return res
}