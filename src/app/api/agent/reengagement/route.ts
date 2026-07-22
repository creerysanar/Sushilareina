export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

function verifyAgent(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.ADMIN_SECRET_KEY}`
}

export async function POST(req: NextRequest) {
  if (!verifyAgent(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { sendReengagementEmail } = await import('@/lib/emails')
    const { generateCouponCode } = await import('@/lib/utils')

    const supabase = createAdminClient()
    const results = { reengagement: 0, errors: 0 }

    const { data: atRisk } = await supabase
      .from('v_at_risk_customers')
      .select('*')
      .gte('days_since_last_order', 30)
      .lte('days_since_last_order', 60)

    for (const customer of atRisk || []) {
      const { data: recent } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', customer.id)
        .eq('type', 'reengagement')
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (recent) continue

      const couponCode = generateCouponCode(`VUELVE-${customer.id.slice(0,4).toUpperCase()}`)
      const { data: coupon } = await supabase.from('coupons').insert({
        code: couponCode,
        description: `Cupón de regreso para ${customer.full_name}`,
        discount_type: 'percent',
        discount_value: 10,
        min_order: 8000,
        max_uses: 1,
        user_id: customer.id,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single()

      try {
        await sendReengagementEmail({
          to: customer.email,
          customerName: customer.full_name || 'Querido cliente',
          daysSince: customer.days_since_last_order,
          lastOrder: null,
          couponCode: coupon?.code,
          couponDiscount: 10,
          expiresIn: 7,
        })

        await supabase.from('campaigns').insert({
          type: 'reengagement',
          user_id: customer.id,
          coupon_id: coupon?.id,
          channel: 'email',
          subject: `¡Te extrañamos!`,
          metadata: { days_since_last_order: customer.days_since_last_order },
        })

        results.reengagement++
      } catch (err) {
        results.errors++
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}