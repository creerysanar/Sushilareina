export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    const body = await req.json()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Error al crear usuario' }, { status: 400 })
    }

    await supabase.from('profiles').insert({
      id: authData.user.id,
      email: body.email,
      full_name: body.full_name,
      phone: body.phone || null,
      birth_date: body.birth_date || null,
      anniversary_date: body.anniversary_date || null,
      wedding_date: body.wedding_date || null,
      special_date_1: body.special_date_1 || null,
      special_date_1_label: body.special_date_1_label || null,
      special_date_2: body.special_date_2 || null,
      special_date_2_label: body.special_date_2_label || null,
      marketing_consent: body.marketing_consent ?? true,
    })

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}