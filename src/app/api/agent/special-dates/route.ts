export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

function verifyAgent(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET_KEY}`
}

const DISCOUNTS: Record<string, { percent: number; minOrder: number; validDays: number; label: string }> = {
  birthday:    { percent: 15, minOrder: 8000,  validDays: 7, label: 'Cumpleaños' },
  anniversary: { percent: 12, minOrder: 10000, validDays: 5, label: 'Aniversario' },
  wedding:     { percent: 15, minOrder: 12000, validDays: 7, label: 'Aniversario de matrimonio' },
  special_1:   { percent: 10, minOrder: 8000,  validDays: 5, label: 'Fecha especial' },
  special_2:   { percent: 10, minOrder: 8000,  validDays: 5, label: 'Fecha especial' },
}

export async function POST(req: NextRequest) {
  if (!verifyAgent(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { sendBirthdayEmail, sendAnniversaryEmail, sendSpecialDateEmail } = await import('@/lib/emails')
    const { generateCouponCode } = await import('@/lib/utils')

    const supabase = createAdminClient()
    const results: Record<string, number> = {}

    const { data: upcoming } = await supabase.rpc('get_upcoming_special_dates')

    for (const event of upcoming || []) {
      const discountConfig = DISCOUNTS[event.date_type] || DISCOUNTS.special_1
      const thisYear = new Date().getFullYear()

      const { data: sent } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', event.user_id)
        .eq('type', event.date_type)
        .gte('sent_at', `${thisYear}-01-01`)
        .maybeSingle()

      if (sent) continue

      const prefix = event.date_type.toUpperCase().slice(0, 4)
      const couponCode = generateCouponCode(`${prefix}-${event.user_id.slice(0, 4).toUpperCase()}`)

      const { data: coupon } = await supabase.from('coupons').insert({
        code: couponCode,
        description: `${discountConfig.label} - ${event.full_name}`,
        discount_type: 'percent',
        discount_value: discountConfig.percent,
        min_order: discountConfig.minOrder,
        max_uses: 1,
        user_id: event.user_id,
        valid_until: new Date(Date.now() + discountConfig.validDays * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single()

      try {
        if (event.date_type === 'birthday') {
          await sendBirthdayEmail({
            to: event.email,
            customerName: event.full_name || 'Querido cliente',
            couponCode: coupon?.code,
            discountPercent: discountConfig.percent,
            validDays: discountConfig.validDays,
            minOrder: discountConfig.minOrder,
          })
        } else if (event.date_type === 'anniversary' || event.date_type === 'wedding') {
          await sendAnniversaryEmail({
            to: event.email,
            customerName: event.full_name || 'Querido cliente',
            dateLabel: discountConfig.label,
            couponCode: coupon?.code,
            discountPercent: discountConfig.percent,
            validDays: discountConfig.validDays,
          })
        } else {
          await sendSpecialDateEmail({
            to: event.email,
            customerName: event.full_name || 'Querido cliente',
            dateLabel: event.date_label || 'tu fecha especial',
            couponCode: coupon?.code,
            discountPercent: discountConfig.percent,
            validDays: discountConfig.validDays,
          })
        }

        await supabase.from('campaigns').insert({
          type: event.date_type,
          user_id: event.user_id,
          coupon_id: coupon?.id,
          channel: 'email',
          subject: `Feliz ${discountConfig.label}!`,
          metadata: { date_type: event.date_type },
        })

        results[event.date_type] = (results[event.date_type] || 0) + 1
      } catch (err) {
        console.error('Email error:', err)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}