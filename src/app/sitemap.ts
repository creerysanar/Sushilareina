import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: config } = await sb.from('business_config').select('website').eq('id', 1).single()
  const baseUrl = `https://${config?.website || 'sushilareina.cl'}`

  const { data: categories } = await sb.from('categories').select('slug, updated_at').eq('active', true)

  const categoryUrls = (categories || []).map(cat => ({
    url: `${baseUrl}/carta/${cat.slug}`,
    lastModified: new Date(cat.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categoryUrls,
  ]
}