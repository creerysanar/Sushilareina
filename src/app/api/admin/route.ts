export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

function verifyAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.ADMIN_SECRET_KEY}`
}

export async function GET(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()

    const [productsRes, categoriesRes, ordersRes, usersRes, paymentConfigRes] = await Promise.all([
      supabase.from('products').select('*').order('category_id').order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'),
      supabase.from('payment_config').select('*').single(),
    ])

    return NextResponse.json({
      products: productsRes.data || [],
      categories: categoriesRes.data || [],
      orders: ordersRes.data || [],
      recentOrders: (ordersRes.data || []).slice(0, 10),
      users: usersRes.data || [],
      paymentConfig: paymentConfigRes.data || {},
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    const body = await req.json()
    const { action } = body

    if (action === 'update_order_status') {
      await supabase.from('orders').update({ status: body.status }).eq('id', body.orderId)
    } else if (action === 'confirm_payment') {
      await supabase.from('orders').update({ payment_status: 'pagado', status: 'confirmado', confirmed_at: new Date().toISOString() }).eq('id', body.orderId)
    } else if (action === 'update_price') {
      await supabase.from('products').update({ price: body.price }).eq('id', body.id)
    } else if (action === 'toggle_product') {
      await supabase.from('products').update({ active: body.active }).eq('id', body.id)
    } else if (action === 'update_payment_config') {
      await supabase.from('payment_config').upsert({ id: 1, ...body })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}