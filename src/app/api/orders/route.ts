export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const OrderSchema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().min(8),
  customer_email: z.string().email().optional(),
  user_id: z.string().uuid().optional(),
  order_type: z.enum(['retiro', 'delivery']),
  delivery_address: z.string().optional(),
  commune: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().optional(),
    product_name: z.string(),
    unit_price: z.number(),
    quantity: z.number().int().min(1),
  })).min(1),
  payment_method: z.enum(['webpay', 'mercadopago', 'transferencia']),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = OrderSchema.parse(body)
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()

    const subtotal = data.items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0)

    let deliveryCost = 0
    if (data.order_type === 'delivery' && data.commune) {
      const { data: config } = await supabase
        .from('site_config').select('value').eq('key', 'delivery_communes').single()
      const communes: { name: string; cost: number }[] = config?.value || []
      const commune = communes.find(c => c.name === data.commune)
      deliveryCost = commune?.cost || 0
    }

    let discount = 0
    if (data.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', data.coupon_code.toUpperCase())
        .eq('active', true)
        .maybeSingle()
      if (coupon && subtotal >= coupon.min_order) {
        discount = coupon.discount_type === 'percent'
          ? subtotal * (coupon.discount_value / 100)
          : coupon.discount_value
      }
    }

    const total = subtotal + deliveryCost - discount

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        user_id: data.user_id || null,
        order_type: data.order_type,
        delivery_address: data.delivery_address || null,
        commune: data.commune || null,
        subtotal,
        delivery_cost: deliveryCost,
        discount,
        coupon_code: data.coupon_code || null,
        total,
        payment_method: data.payment_method,
        payment_status: 'pendiente',
        status: 'nuevo',
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('order_items').insert(
      data.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.unit_price * item.quantity,
      }))
    )

    // Enviar emails en background
    try {
      const { sendOrderConfirmationEmail, sendNewOrderNotification } = await import('@/lib/emails')
      const orderWithItems = { ...order, items: data.items }
      if (data.customer_email) {
        sendOrderConfirmationEmail(orderWithItems, data.customer_email).catch(console.error)
      }
      sendNewOrderNotification(orderWithItems).catch(console.error)
    } catch (e) {
      console.error('Email error:', e)
    }

    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Order error:', error)
    return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ orders: data })
}