export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_id, order_number, items, total, customer_email } = body

    const preference = new Preference(client)

    const result = await preference.create({
      body: {
        external_reference: order_id,
        items: items.map((item: any) => ({
          id: item.product_id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: 'CLP',
        })),
        payer: {
          email: customer_email || 'cliente@sushilareina.cl',
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/?pago=exitoso&order=${order_number}`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/?pago=fallido&order=${order_number}`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/?pago=pendiente&order=${order_number}`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/webhook`,
        statement_descriptor: 'Sushi La Reina',
        metadata: {
          order_id,
          order_number,
        },
      },
    })

    return NextResponse.json({
      success: true,
      preference_id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    })
  } catch (error: any) {
    console.error('MercadoPago preference error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}