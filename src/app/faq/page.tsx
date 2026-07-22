import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

async function getData() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [{ data: faqs }, { data: config }] = await Promise.all([
    sb.from('cms_faqs').select('*').eq('active', true).order('sort_order'),
    sb.from('business_config').select('*').eq('id', 1).single(),
  ])
  return { faqs: faqs || [], config }
}

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getData()
  return {
    title: `Preguntas Frecuentes — ${config?.name || 'Sushi La Reina'}`,
    description: `Resuelve tus dudas sobre pedidos, delivery, horarios y más en ${config?.name || 'Sushi La Reina'}.`,
    openGraph: {
      title: `Preguntas Frecuentes — ${config?.name || 'Sushi La Reina'}`,
      description: `Todo lo que necesitas saber sobre ${config?.name || 'Sushi La Reina'}.`,
    },
  }
}

export default async function FAQPage() {
  const { faqs, config } = await getData()

  const categories = Array.from(new Set(faqs.map((f: any) => f.category)))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f: any) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDE8', fontFamily: 'sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav simple */}
      <nav style={{ background: 'rgba(238,224,216,0.97)', borderBottom: '1px solid rgba(27,42,74,.1)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A', textDecoration: 'none' }}>
          ← {config?.name || 'Sushi La Reina'}
        </a>
        <span style={{ fontSize: '0.75rem', color: 'rgba(27,42,74,.4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Preguntas Frecuentes</span>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, color: '#1B2A4A', marginBottom: '0.5rem' }}>
          Preguntas <em style={{ color: '#C8956A' }}>Frecuentes</em>
        </h1>
        <p style={{ color: 'rgba(27,42,74,.5)', fontSize: '1rem', marginBottom: '3rem' }}>
          Todo lo que necesitas saber sobre {config?.name || 'Sushi La Reina'}
        </p>

        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.72rem', letterSpacing: '.15em', textTransform: 'uppercase', color: '#C8956A', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(200,149,106,.2)' }}>
              {cat === 'general' ? 'General' : cat === 'delivery' ? 'Delivery' : cat === 'pagos' ? 'Pagos' : cat === 'carta' ? 'Carta' : cat === 'fidelidad' ? 'Fidelidad' : cat}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {faqs.filter((f: any) => f.category === cat).map((faq: any) => (
                <details key={faq.id} style={{ background: '#EEE0D8', borderRadius: 4, overflow: 'hidden' }}>
                  <summary style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: 500, color: '#1B2A4A', fontSize: '0.95rem', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {faq.question}
                    <span style={{ color: '#C8956A', flexShrink: 0, marginLeft: 16 }}>+</span>
                  </summary>
                  <div style={{ padding: '0 1.25rem 1rem', color: 'rgba(27,42,74,.7)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: '3rem', background: '#1B2A4A', borderRadius: 4, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#F5EDE8', marginBottom: 4 }}>¿Tienes más preguntas?</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(245,237,232,.5)' }}>Escríbenos directamente por WhatsApp</div>
          </div>
          <a href={`https://wa.me/${config?.whatsapp || '56971061232'}`} target="_blank" rel="noopener noreferrer"
            style={{ background: '#25D366', color: '#fff', padding: '10px 24px', borderRadius: 2, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            💬 WhatsApp
          </a>
        </div>
      </div>

      <footer style={{ background: '#EEE0D8', borderTop: '1px solid rgba(27,42,74,.1)', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(27,42,74,.4)' }}>
        {config?.name || 'Sushi La Reina'} · {config?.address}, {config?.city} · <a href="/" style={{ color: '#C8956A', textDecoration: 'none' }}>Volver al inicio</a>
      </footer>
    </div>
  )
}