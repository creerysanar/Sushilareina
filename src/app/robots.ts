import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: config } = await sb.from('business_config').select('website').eq('id', 1).single()
  const baseUrl = `https://${config?.website || 'sushilareina.cl'}`

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}