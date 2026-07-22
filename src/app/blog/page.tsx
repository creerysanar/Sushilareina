// v2
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

async function getData() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [{ data: posts }, { data: config }] = await Promise.all([
    sb.from('cms_posts').select('id,slug,title,excerpt,cover_image,author,created_at,featured').eq('published', true).order('created_at', { ascending: false }),
    sb.from('business_config').select('*').eq('id', 1).single(),
  ])
  return { posts: posts || [], config }
}

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getData()
  return {
    title: `Blog — ${config?.name || 'Sushi La Reina'}`,
    description: `Novedades, recetas y notas de ${config?.name || 'Sushi La Reina'}.`,
  }
}

export default async function BlogPage() {
  const { posts, config } = await getData()

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDE8', fontFamily: 'sans-serif' }}>
      <nav style={{ background: 'rgba(238,224,216,0.97)', borderBottom: '1px solid rgba(27,42,74,.1)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A', textDecoration: 'none' }}>
          ← {config?.name || 'Sushi La Reina'}
        </a>
        <span style={{ fontSize: '0.75rem', color: 'rgba(27,42,74,.4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Blog</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, color: '#1B2A4A', marginBottom: '0.5rem' }}>
          Nuestro <em style={{ color: '#C8956A' }}>Blog</em>
        </h1>
        <p style={{ color: 'rgba(27,42,74,.5)', fontSize: '1rem', marginBottom: '3rem' }}>
          Novedades, recetas y notas de {config?.name || 'Sushi La Reina'}
        </p>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(27,42,74,.4)', padding: '4rem 0', fontSize: '0.9rem' }}>
            Próximamente publicaremos contenido aquí.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {posts.map((post: any) => (
              <a key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#EEE0D8', borderRadius: 4, overflow: 'hidden' }}>
                  {post.cover_image ? (
                    <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: 180, background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🍣</div>
                  )}
                  <div style={{ padding: '1.25rem' }}>
                    {post.featured && (
                      <span style={{ fontSize: '0.65rem', background: '#C8956A', color: '#fff', padding: '2px 8px', borderRadius: 2, fontWeight: 700, marginBottom: 8, display: 'inline-block' }}>DESTACADO</span>
                    )}
                    <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A', marginBottom: 8, lineHeight: 1.4 }}>{post.title}</h2>
                    {post.excerpt && <p style={{ fontSize: '0.82rem', color: 'rgba(27,42,74,.55)', lineHeight: 1.6, marginBottom: 12 }}>{post.excerpt}</p>}
                    <div style={{ fontSize: '0.72rem', color: 'rgba(27,42,74,.35)' }}>
                      {new Date(post.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <footer style={{ background: '#EEE0D8', borderTop: '1px solid rgba(27,42,74,.1)', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(27,42,74,.4)' }}>
        {config?.name || 'Sushi La Reina'} · <a href="/" style={{ color: '#C8956A', textDecoration: 'none' }}>Volver al inicio</a>
      </footer>
    </div>
  )
}