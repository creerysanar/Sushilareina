export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const body = await req.json()
    const { order_id, payment_method, payment_ref } = body

    const supabase = createAdminClient()

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        payment_status: 'pagado',
        status: 'confirmado',
        confirmed_at: new Date().toISOString(),
        payment_ref,
      })
      .eq('id', order_id)
      .select()
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (order.user_id) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/loyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: order.user_id, order_id: order.id }),
      })
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Payment confirm error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token_ws')

  if (!token) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?error=pago_cancelado`)

  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_ref', token)
      .single()

    if (order) {
      await supabase.from('orders').update({
        payment_status: 'pagado',
        status: 'confirmado',
        confirmed_at: new Date().toISOString(),
      }).eq('id', order.id)

      if (order.user_id) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/loyalty`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: order.user_id, order_id: order.id }),
        })
      }
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?pago=exitoso`)
  } catch (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?error=pago_fallido`)
  }
}