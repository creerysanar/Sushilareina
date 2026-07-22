export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { user_id, order_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

    const supabase = createAdminClient()

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('loyalty_stamps')
      .select('id')
      .eq('user_id', user_id)
      .eq('date', today)
      .single()

    if (existing) return NextResponse.json({ message: 'Ya tiene timbre hoy', stamped: false })

    await supabase.from('loyalty_stamps').insert({ user_id, order_id, date: today })

    const { data: stamps } = await supabase
      .from('loyalty_stamps')
      .select('id')
      .eq('user_id', user_id)

    const totalStamps = stamps?.length || 0

    const { data: config } = await supabase
      .from('loyalty_config')
      .select('*')
      .single()

    const required = config?.stamps_required || 10

    if (totalStamps >= required) {
      const { data: existingReward } = await supabase
        .from('loyalty_rewards')
        .select('id')
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .single()

      if (!existingReward) {
        const qrCode = `SLR-${user_id.slice(0,8).toUpperCase()}-${Date.now()}`
        await supabase.from('loyalty_rewards').insert({
          user_id,
          qr_code: qrCode,
          status: 'pending'
        })
        await supabase.from('loyalty_stamps').delete().eq('user_id', user_id)
      }
    }

    return NextResponse.json({ stamped: true, totalStamps, required })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { qr_code } = await req.json()
    const supabase = createAdminClient()

    const { data: reward, error } = await supabase
      .from('loyalty_rewards')
      .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
      .eq('qr_code', qr_code)
      .eq('status', 'pending')
      .select()
      .single()

    if (error || !reward) return NextResponse.json({ error: 'QR inválido o ya canjeado' }, { status: 400 })
    return NextResponse.json({ success: true, reward })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}