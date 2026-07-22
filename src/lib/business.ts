import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function resolveBusiness() {
  const headersList = headers()
  const domain = headersList.get('x-domain') || ''

  const sb = getSb()

  // Buscar por dominio o vercel_url
  const { data: business } = await sb
    .from('businesses')
    .select('id, slug, name, domain, vercel_url')
    .or(`domain.eq.${domain},vercel_url.eq.${domain}`)
    .eq('active', true)
    .single()

  if (!business) {
    // Fallback a Sushi La Reina en desarrollo local
    const { data: fallback } = await sb
      .from('businesses')
      .select('id, slug, name')
      .eq('slug', 'sushilareina')
      .single()
    return fallback
  }

  return business
}

export async function getBusinessConfig(businessId: string) {
  const sb = getSb()
  const { data } = await sb
    .from('business_config')
    .select('*')
    .eq('business_id', businessId)
    .single()
  return data
}

export async function getFullBusinessData(businessId: string) {
  const sb = getSb()
  const [configRes, schedulesRes] = await Promise.all([
    sb.from('business_config').select('*').eq('business_id', businessId).single(),
    sb.from('businesses').select('*').eq('id', businessId).single(),
  ])
  return {
    config: configRes.data,
    business: schedulesRes.data,
  }
}