import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

async function getData(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [{ data: post }, { data: config }] = await Promise.all([
    sb.from('cms_posts').select('*').eq('slug', slug).eq('published', true).single(),
    sb.from('business_config').select('*').eq('id', 1).single(),
  ])
  return { post, config }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { post, config } = await getData(params.slug)
  if (!post) return { title: 'Post no encontrado' }
  return {
    title: post.meta_title || `${post.title} — ${config?.name || 'Sushi La Reina'}`,
    description: post.meta_description || post.excerpt || '',
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || '',
      images: post.og_image ? [post.og_image] : [],
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { post, config } = await getData(params.slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    author: { '@type': 'Organization', name: post.author || config?.name },
    publisher: { '@type': 'Organization', name: config?.name },
    datePublished: post.created_at,
    dateModified: post.updated_at,
    image: post.cover_image || '',
    url: `https://${config?.website}/blog/${post.slug}`,
  }

  const isExternal = post.post_type === 'link' || post.post_type === 'embed'

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDE8', fontFamily: 'sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav style={{ background: 'rgba(238,224,216,0.97)', borderBottom: '1px solid rgba(27,42,74,.1)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/blog" style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A', textDecoration: 'none' }}>
          ← Blog
        </a>
        <a href="/" style={{ fontSize: '0.75rem', color: 'rgba(27,42,74,.4)', textDecoration: 'none' }}>{config?.name}</a>
      </nav>

      {post.cover_image && (
        <div style={{ width: '100%', height: 400, overflow: 'hidden' }}>
          <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Badge tipo */}
        {isExternal && (
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.7rem', background: post.post_type === 'embed' ? 'rgba(27,42,74,.1)' : 'rgba(200,149,106,.12)', color: post.post_type === 'embed' ? '#1B2A4A' : '#C8956A', padding: '3px 10px', borderRadius: 2, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {post.post_type === 'embed' ? '📱 Red social' : '🔗 Artículo externo'}
            </span>
          </div>
        )}

        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 700, color: '#1B2A4A', marginBottom: '1rem', lineHeight: 1.2 }}>
          {post.title}
        </h1>

        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'rgba(27,42,74,.4)', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(27,42,74,.1)', flexWrap: 'wrap' }}>
          <span>{post.author || config?.name}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          {isExternal && post.external_url && (
            <>
              <span>·</span>
              <span style={{ color: '#C8956A' }}>{new URL(post.external_url).hostname.replace('www.', '')}</span>
            </>
          )}
        </div>

        {post.excerpt && (
          <p style={{ fontSize: '1.1rem', color: 'rgba(27,42,74,.65)', lineHeight: 1.8, marginBottom: '2rem', fontStyle: 'italic' }}>
            {post.excerpt}
          </p>
        )}

        {/* Link externo */}
        {isExternal && post.external_url && (
          <div style={{ background: '#EEE0D8', border: '1px solid rgba(27,42,74,.1)', borderRadius: 8, padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              {post.post_type === 'embed' ? '📱' : '📰'}
            </div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A', marginBottom: '0.5rem' }}>
              {post.post_type === 'embed' ? 'Ver publicación en redes sociales' : 'Leer artículo completo'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(27,42,74,.45)', marginBottom: '1.5rem' }}>
              {post.post_type === 'embed'
                ? 'Este contenido está publicado en redes sociales. Haz clic para verlo.'
                : `Este artículo fue publicado originalmente en ${new URL(post.external_url).hostname.replace('www.', '')}`
              }
            </div>
            <a href={post.external_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#1B2A4A', color: '#F5EDE8', padding: '14px 32px', borderRadius: 2, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, letterSpacing: '.06em' }}>
              {post.post_type === 'embed' ? 'Ver publicación →' : 'Leer artículo completo →'}
            </a>
            <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'rgba(27,42,74,.3)' }}>
              Se abrirá en una nueva pestaña
            </div>
          </div>
        )}

        {/* Artículo propio */}
        {post.post_type === 'article' && post.content && (
          <div style={{ fontSize: '0.95rem', color: 'rgba(27,42,74,.8)', lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: post.content }} />
        )}

        {/* CTA volver */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(27,42,74,.1)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/blog" style={{ color: '#C8956A', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>← Ver más artículos</a>
          <span style={{ color: 'rgba(27,42,74,.2)' }}>·</span>
          <a href="/" style={{ color: '#1B2A4A', textDecoration: 'none', fontSize: '0.88rem' }}>Ir al inicio</a>
          <span style={{ color: 'rgba(27,42,74,.2)' }}>·</span>
          <a href={`https://wa.me/${config?.whatsapp || '56971061232'}`} target="_blank" rel="noopener noreferrer"
            style={{ color: '#25D366', textDecoration: 'none', fontSize: '0.88rem' }}>💬 Hacer un pedido</a>
        </div>
      </div>

      <footer style={{ background: '#EEE0D8', borderTop: '1px solid rgba(27,42,74,.1)', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(27,42,74,.4)' }}>
        {config?.name} · <a href="/blog" style={{ color: '#C8956A', textDecoration: 'none' }}>Blog</a> · <a href="/" style={{ color: '#C8956A', textDecoration: 'none' }}>Inicio</a>
      </footer>
    </div>
  )
}