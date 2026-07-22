export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'

    const [dailySalesRes, topProductsRes, monthlyKpisRes, atRiskRes] = await Promise.all([
      supabase.from('v_daily_sales').select('*').order('day', { ascending: false }).limit(30),
      supabase.from('v_top_products').select('*').limit(10),
      supabase.from('v_monthly_kpis').select('*').single(),
      supabase.from('v_at_risk_customers').select('*'),
    ])

    return NextResponse.json({
      dailySales: dailySalesRes.data || [],
      topProducts: topProductsRes.data || [],
      monthlyKpis: monthlyKpisRes.data || {},
      atRiskCustomers: atRiskRes.data || [],
      paymentDistribution: [],
      agentStats: [],
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}