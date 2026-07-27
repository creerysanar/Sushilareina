export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    // Solo procesar pagos aprobados
    if (type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    // Obtener detalles del pago desde MercadoPago
    const payment = new Payment(client)
    const paymentData = await payment.get({ id: paymentId })

    if (paymentData.status !== 'approved') return NextResponse.json({ ok: true })

    const orderId = paymentData.external_reference
    if (!orderId) return NextResponse.json({ ok: true })

    // Actualizar orden en Supabase
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()

    const { data: order } = await supabase
      .from('orders')
      .update({
        payment_status: 'pagado',
        status: 'nuevo',
        payment_ref: String(paymentId),
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    // Agregar timbre de fidelidad si el usuario tiene cuenta
    if (order?.user_id) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/loyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_stamp',
          user_id: order.user_id,
          order_id: order.id,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('MP webhook error:', error)
    return NextResponse.json({ ok: true }) // Siempre retornar 200 a MercadoPago
  }
}

// MercadoPago verifica el webhook con GET
export async function GET() {
  return NextResponse.json({ ok: true })
}