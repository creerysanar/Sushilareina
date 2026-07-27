'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { Product, Category, CartItem, DeliveryCommune } from '@/types'

const SCHEDULE: { open: string; close: string }[] = [
  { open: '12:00', close: '22:15' },
  { open: '12:00', close: '22:30' },
  { open: '12:00', close: '22:30' },
  { open: '12:00', close: '22:30' },
  { open: '12:00', close: '22:30' },
  { open: '12:00', close: '00:00' },
  { open: '12:00', close: '00:00' },
]
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getNowSantiago() {
  const now = new Date()
  const str = now.toLocaleString('en-CA', {
    timeZone: 'America/Santiago', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const [datePart, timePart] = str.split(', ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()
  return { hour, minute, dayOfWeek, dayName: DAY_NAMES[dayOfWeek] }
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function useBusinessStatus() {
  const [status, setStatus] = useState<{
    isOpen: boolean; todaySchedule: { open: string; close: string }
    dayName: string; nextOpenDay: string; nextOpenTime: string
  } | null>(null)

  useEffect(() => {
    function compute() {
      const { hour, minute, dayOfWeek } = getNowSantiago()
      const todaySchedule = SCHEDULE[dayOfWeek]
      const nowMin = hour * 60 + minute
      const openMin = toMinutes(todaySchedule.open)
      let closeMin = toMinutes(todaySchedule.close)
      if (closeMin === 0) closeMin = 24 * 60
      const isOpen = nowMin >= openMin && nowMin < closeMin
      let nextOpenDay: string
      let nextOpenTime: string
      if (!isOpen) {
        if (nowMin < openMin) {
          nextOpenDay = 'hoy'; nextOpenTime = todaySchedule.open
        } else {
          const nextIdx = (dayOfWeek + 1) % 7
          if (hour < 3) { nextOpenDay = 'hoy'; nextOpenTime = SCHEDULE[nextIdx].open }
          else { nextOpenDay = 'mañana'; nextOpenTime = SCHEDULE[nextIdx].open }
        }
      } else {
        const nextIdx = (dayOfWeek + 1) % 7
        nextOpenDay = DAY_NAMES[nextIdx]; nextOpenTime = SCHEDULE[nextIdx].open
      }
      setStatus({ isOpen, todaySchedule, dayName: DAY_NAMES[dayOfWeek], nextOpenDay, nextOpenTime })
    }
    compute()
    const interval = setInterval(compute, 60_000)
    return () => clearInterval(interval)
  }, [])
  return status
}

function useBusinessConfig() {
  const [config, setConfig] = useState<any>(null)
  useEffect(() => {
    const sb = createClient()
    sb.from('business_config').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setConfig(data) })
  }, [])
  return config
}

function useMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Record<number, Product[]>>({})
  const [communes, setCommunes] = useState<DeliveryCommune[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('categories').select('*').eq('active', true).order('sort_order'),
      sb.from('products').select('*').eq('active', true).order('sort_order'),
      sb.from('site_config').select('value').eq('key', 'delivery_communes').single(),
    ]).then(([cats, prods, config]) => {
      const catData = cats.data || []
      const prodData = prods.data || []
      const grouped: Record<number, Product[]> = {}
      catData.forEach(c => { grouped[c.id] = prodData.filter(p => p.category_id === c.id) })
      setCategories(catData); setProducts(grouped)
      setCommunes(config.data?.value || []); setLoading(false)
    })
  }, [])
  return { categories, products, communes, loading }
}

function WhatsAppIcon({ size = 24, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function ClosedBanner({ nextOpenDay, nextOpenTime }: { nextOpenDay: string; nextOpenTime: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100,
      background: '#1B2A4A', borderBottom: '1px solid rgba(200,149,106,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '10px 1.5rem',
    }}>
      <span style={{ color: '#C8956A', fontSize: '0.75rem' }}>●</span>
      <span style={{ fontSize: '0.8rem', color: 'rgba(245,237,232,0.85)', letterSpacing: '.04em' }}>
        Estamos cerrados —{' '}
        {nextOpenDay === 'hoy' || nextOpenDay === 'mañana'
          ? <><strong style={{ color: '#F5EDE8' }}>Abrimos {nextOpenDay}</strong> a las <strong style={{ color: '#F5EDE8' }}>{nextOpenTime}</strong></>
          : <>Abrimos el <strong style={{ color: '#F5EDE8' }}>{nextOpenDay}</strong> a las <strong style={{ color: '#F5EDE8' }}>{nextOpenTime}</strong></>
        }
      </span>
      <button onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: 'rgba(245,237,232,0.5)', cursor: 'pointer', fontSize: '1rem', marginLeft: 8, lineHeight: 1 }}>
        ✕
      </button>
    </div>
  )
}

export default function HomePage() {
  const { categories, products, communes, loading } = useMenu()
  const businessStatus = useBusinessStatus()
  const bizConfig = useBusinessConfig()
  const [activeTab, setActiveTab] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [orderType, setOrderType] = useState<'retiro' | 'delivery'>('retiro')
  const [selectedCommune, setSelectedCommune] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<'webpay' | 'mercadopago' | 'transferencia'>('webpay')
  const menuRef = useRef<HTMLElement>(null)
  const isClosed = businessStatus !== null && !businessStatus.isOpen
  const topOffset = isClosed ? 64 + 41 : 64

  useEffect(() => {
    if (categories.length > 0 && activeTab === null) setActiveTab(categories[0].id)
  }, [categories])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadProfile(data.user.id)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
      if (session?.user) loadProfile(session.user.id)
      else setUserProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const sb = createClient()
    const { data } = await sb.from('user_profiles').select('*').eq('user_id', userId).single()
    if (data) setUserProfile(data)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    showToast(`${product.name} agregado`)
    if (!cartOpen) setCartOpen(true)
  }

  function changeQty(productId: string, delta: number) {
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))
  }

  const cartCount = cart.reduce((a, i) => a + i.quantity, 0)
  const subtotal = cart.reduce((a, i) => a + i.product.price * i.quantity, 0)
  const deliveryCost = orderType === 'delivery' ? communes.find(c => c.name === selectedCommune)?.cost || 0 : 0
  const total = subtotal + deliveryCost

  async function confirmOrder(formData: { name: string; phone: string; email?: string; address?: string; notes?: string }) {
    if (cart.length === 0) return showToast('Agrega items al carrito')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.name, customer_phone: formData.phone,
          customer_email: formData.email, user_id: user?.id, order_type: orderType,
          delivery_address: formData.address, commune: selectedCommune,
          items: cart.map(i => ({ product_id: i.product.id, product_name: i.product.name, unit_price: i.product.price, quantity: i.quantity })),
          payment_method: selectedPayment, notes: formData.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.paymentUrl && selectedPayment !== 'transferencia') window.open(data.paymentUrl, '_blank')
      else openWSPOrder(data.order, formData)
      setCart([]); setCartOpen(false); setCheckoutOpen(false)
      showToast('✅ ¡Pedido enviado con éxito!')
    } catch (err: any) { showToast('Error al crear el pedido: ' + err.message) }
  }

  function openWSPOrder(order: any, form: any) {
    const items = cart.map(i => `• ${i.product.name} ×${i.quantity} = ${formatPrice(i.product.price * i.quantity)}`).join('\n')
    const msg = `🍣 *Pedido #${order.order_number}*\n\n*Cliente:* ${form.name}\n*Tel:* ${form.phone}\n*Tipo:* ${orderType === 'retiro' ? 'Retiro' : `Delivery a ${form.address}, ${selectedCommune}`}\n\n*Pedido:*\n${items}\n\n*Total: ${formatPrice(total)}*\n*Pago:* ${selectedPayment.toUpperCase()}\n\n_sushilareina.cl_`
    window.open(`https://wa.me/${bizConfig?.whatsapp || '56971061232'}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const displayName = userProfile?.alias || userProfile?.full_name || user?.user_metadata?.full_name || null

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDE8' }}>
      {isClosed && businessStatus && (
        <ClosedBanner nextOpenDay={businessStatus.nextOpenDay} nextOpenTime={businessStatus.nextOpenTime} />
      )}

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: isClosed ? 41 : 0, width: '100%', zIndex: 1000,
        background: 'rgba(238,224,216,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(27,42,74,0.1)',
        padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo.webp" alt={bizConfig?.name || 'Logo'} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', letterSpacing: '.05em', color: '#1B2A4A' }}>{bizConfig?.name || 'Sushi La Reina'}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ color: 'rgba(27,42,74,0.55)', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Carta</a>
          <a onClick={() => { menuRef.current?.scrollIntoView({ behavior: 'smooth' }); setActiveTab(categories.find(c => c.slug === 'promociones')?.id || null) }}
            style={{ color: 'rgba(27,42,74,0.55)', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Promociones</a>
          <a href="/blog" style={{ color: 'rgba(27,42,74,0.55)', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none' }}>Blog</a>
          <a href="/faq" style={{ color: 'rgba(27,42,74,0.55)', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none' }}>FAQ</a>
          {!user && (
            <a onClick={() => setAuthOpen(true)}
              style={{ color: '#C8956A', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(200,149,106,.3)', padding: '4px 12px', borderRadius: 2 }}>
              Únete
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => user ? setProfileOpen(true) : setAuthOpen(true)}
            style={{ background: 'transparent', border: '1px solid rgba(27,42,74,0.2)', color: '#1B2A4A', padding: '7px 16px', borderRadius: 2, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName ? `👤 ${displayName}` : 'Ingresar'}
          </button>
          <button onClick={() => setCartOpen(true)}
            style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '7px 16px', borderRadius: 2, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
            🛒 Carrito
            {cartCount > 0 && (
              <span style={{ background: '#C8956A', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>
            )}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', paddingTop: topOffset,
        background: 'linear-gradient(160deg, #F5EDE8 0%, #EEE0D8 100%)',
      }}>
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 680, padding: '0 2rem', animation: 'fadeUp 1s ease both' }}>
          <div style={{ display: 'inline-block', border: '1px solid #C8956A', color: '#C8956A', padding: '5px 20px', fontSize: '0.7rem', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: '2rem' }}>
            {bizConfig?.hero_badge || 'Lynch Sur #17 · La Reina · Santiago'}
          </div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <img src="/logo.webp" alt={bizConfig?.name || 'Logo'} style={{ width: 280, height: 280, borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <p style={{ color: 'rgba(27,42,74,.65)', fontSize: '1rem', letterSpacing: '.04em', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            {bizConfig?.tagline || 'Fusión japonesa · Rolls · Nikkei · Ceviches'}<br />
            {bizConfig?.description || 'Retiro y delivery en La Reina y comunas vecinas'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '14px 36px', fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
              Ver la Carta
            </button>
            <button onClick={() => window.open(`https://wa.me/${bizConfig?.whatsapp || '56971061232'}`, '_blank')}
              style={{ background: '#25D366', color: '#fff', border: 'none', padding: '14px 36px', fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <WhatsAppIcon size={18} color="white" />
              WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section ref={menuRef} style={{ padding: '5rem 2rem 4rem', maxWidth: 1400, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, marginBottom: '.5rem', color: '#1B2A4A' }}>
          Nuestra <em style={{ color: '#C8956A' }}>Carta</em>
        </h2>
        <p style={{ color: 'rgba(27,42,74,.45)', fontSize: '0.8rem', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
          {bizConfig?.catalog_subtitle || 'Rolls · Ceviches · Especiales · Postres'}
        </p>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(27,42,74,.1)', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '2.5rem' }}>
          {loading
            ? [1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ width: 100, height: 40, flexShrink: 0, margin: '0 1px' }} />)
            : categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)}
                style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'none', fontFamily: 'inherit', color: activeTab === cat.id ? '#C8956A' : 'rgba(27,42,74,.45)', borderBottom: activeTab === cat.id ? '2px solid #C8956A' : '2px solid transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', transition: 'all .2s' }}>
                {cat.name}
              </button>
            ))
          }
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 2 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 130 }} />)}
          </div>
        ) : categories.map(cat => activeTab === cat.id && (
          <div key={cat.id} style={{ animation: 'pageFlip .4s ease both' }}>
            {cat.slug === 'promociones' && (products[cat.id] || []).filter(p => p.featured)[0] && (() => {
              const featured = (products[cat.id] || []).filter(p => p.featured)[0]
              return (
                <div onClick={() => addToCart(featured)} style={{ background: 'linear-gradient(135deg,#1B2A4A,#0A1628)', borderRadius: 4, padding: '1.5rem 2rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '2rem', cursor: 'pointer' }}>
                  <div>
                    <div style={{ background: '#C8956A', color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 10px', display: 'inline-block', marginBottom: 8 }}>Más Popular</div>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.4rem', fontWeight: 700, color: '#F5EDE8' }}>{featured.name}</div>
                    <div style={{ color: 'rgba(245,237,232,.65)', fontSize: '0.82rem', marginTop: 4 }}>{featured.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: '2rem', fontWeight: 700, color: '#C8956A' }}>{formatPrice(featured.price)}</div>
                    <button style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 2, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>Agregar →</button>
                  </div>
                </div>
              )
            })()}
            {cat.slug !== 'promociones' && (
              <div style={{ color: 'rgba(27,42,74,.4)', fontSize: '0.78rem', letterSpacing: '.08em', fontStyle: 'italic', marginBottom: '1rem' }}>
                {cat.name}
                {cat.slug === 'california' && ' — Envuelto en sésamo o ciboulette'}
                {cat.slug === 'avocado' && ' — Envuelto en salmón +$1.000'}
                {cat.slug === 'hotrolls' && ' — Tempura caliente'}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(275px,1fr))', gap: 2, background: 'rgba(27,42,74,.06)' }}>
              {(products[cat.id] || []).filter(p => !(cat.slug === 'promociones' && p.featured)).map(product => (
                <div key={product.id} onClick={() => addToCart(product)}
                  style={{ background: '#F5EDE8', padding: '1.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'background .2s', position: 'relative' }}>
                  {product.badge && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: product.badge.includes('Vegan') ? '#2D6A4F' : '#1B2A4A', color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '.1em', padding: '2px 8px', textTransform: 'uppercase' }}>{product.badge}</span>
                  )}
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, paddingRight: product.badge ? 60 : 0, color: '#1B2A4A' }}>{product.name}</div>
                  {product.description && <div style={{ fontSize: '0.75rem', color: 'rgba(27,42,74,.45)', lineHeight: 1.5, flex: 1 }}>{product.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div>
                      <div style={{ color: '#C8956A', fontWeight: 600 }}>{formatPrice(product.price)}</div>
                      {product.portions && <div style={{ fontSize: '0.65rem', color: 'rgba(27,42,74,.35)', letterSpacing: '.06em' }}>{product.portions}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); addToCart(product) }}
                      style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', width: 30, height: 30, borderRadius: 2, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#EEE0D8', borderTop: '1px solid rgba(27,42,74,.1)', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.4rem', color: '#C8956A', marginBottom: 12 }}>{bizConfig?.name || 'Sushi La Reina'}</div>
            <div style={{ fontSize: '0.8rem', lineHeight: 2 }}>
              <a href={bizConfig?.google_maps_url || 'https://maps.google.com'} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1B2A4A', textDecoration: 'none', background: 'rgba(27,42,74,.08)', border: '1px solid rgba(27,42,74,.15)', borderRadius: 2, padding: '7px 12px', fontSize: '0.78rem', marginBottom: 8 }}>
                📍 {bizConfig?.address || 'Lynch Sur #17'}, {bizConfig?.city || 'La Reina'} · <span style={{ color: '#C8956A' }}>Ver en Maps →</span>
              </a>
              <br />
              <span style={{ color: 'rgba(27,42,74,.6)' }}>+{bizConfig?.phone || '56971061232'} · {bizConfig?.website || 'sushilareina.cl'}</span><br />
              <span style={{ color: 'rgba(27,42,74,.6)' }}>{bizConfig?.instagram || '@sushilareina_'} · {bizConfig?.facebook || '/sushilareina'}</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', color: '#1B2A4A', fontWeight: 600 }}>Horarios</span>
              {businessStatus && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 2, background: businessStatus.isOpen ? 'rgba(45,106,79,.12)' : 'rgba(155,34,38,.1)', color: businessStatus.isOpen ? '#2D6A4F' : '#9B2226', border: `1px solid ${businessStatus.isOpen ? 'rgba(45,106,79,.25)' : 'rgba(155,34,38,.2)'}` }}>
                  {businessStatus.isOpen ? '● Abierto ahora' : '● Cerrado'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Lun – Jue', schedule: SCHEDULE[1] },
                { label: 'Vie – Sáb', schedule: SCHEDULE[5] },
                { label: 'Domingo', schedule: SCHEDULE[0] },
              ].map(({ label, schedule }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'rgba(27,42,74,.6)', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: '#1B2A4A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{schedule.open} – {schedule.close}</span>
                </div>
              ))}
            </div>
            {businessStatus && businessStatus.isOpen && (
              <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'rgba(27,42,74,.4)', fontStyle: 'italic' }}>
                Hoy cerramos a las {businessStatus.todaySchedule.close}
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* WSP FLOAT */}
      <button onClick={() => window.open(`https://wa.me/${bizConfig?.whatsapp || '56971061232'}`, '_blank')}
        style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 900, background: '#25D366', border: 'none', borderRadius: '50%', width: 52, height: 52, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(37,211,102,.4)' }}>
        <WhatsAppIcon size={28} color="white" />
      </button>

      {/* CART SIDEBAR */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
          <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(27,42,74,.3)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 400, background: '#F5EDE8', borderLeft: '1px solid rgba(27,42,74,.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(27,42,74,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', color: '#1B2A4A' }}>Tu Pedido</span>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '1.4rem', cursor: 'pointer', opacity: .5 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cart.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(27,42,74,.35)', padding: '3rem 0', fontSize: '0.85rem' }}>Tu carrito está vacío</div>
                : cart.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', background: '#EEE0D8', borderRadius: 2 }}>
                    <div style={{ flex: 1, fontSize: '0.85rem', color: '#1B2A4A' }}>{item.product.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => changeQty(item.product.id, -1)} style={{ background: 'rgba(27,42,74,.1)', border: 'none', color: '#1B2A4A', width: 22, height: 22, cursor: 'pointer', borderRadius: 2, fontSize: '0.9rem' }}>−</button>
                      <span style={{ fontSize: '0.85rem', minWidth: 16, textAlign: 'center', color: '#1B2A4A' }}>{item.quantity}</span>
                      <button onClick={() => changeQty(item.product.id, 1)} style={{ background: 'rgba(27,42,74,.1)', border: 'none', color: '#1B2A4A', width: 22, height: 22, cursor: 'pointer', borderRadius: 2, fontSize: '0.9rem' }}>+</button>
                    </div>
                    <div style={{ color: '#C8956A', fontWeight: 600, fontSize: '0.85rem', minWidth: 64, textAlign: 'right' }}>{formatPrice(item.product.price * item.quantity)}</div>
                  </div>
                ))
              }
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(27,42,74,.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(27,42,74,.08)', marginBottom: '0.75rem' }}>
                {(['retiro', 'delivery'] as const).map(t => (
                  <button key={t} onClick={() => setOrderType(t)}
                    style={{ padding: '0.6rem', border: 'none', fontFamily: 'inherit', fontSize: '0.75rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', background: orderType === t ? '#1B2A4A' : 'transparent', color: orderType === t ? '#F5EDE8' : 'rgba(27,42,74,.5)' }}>
                    {t === 'retiro' ? '🏃 Retiro' : '🛵 Delivery'}
                  </button>
                ))}
              </div>
              {orderType === 'delivery' && (
                <select value={selectedCommune} onChange={e => setSelectedCommune(e.target.value)}
                  style={{ width: '100%', background: '#EEE0D8', border: '1px solid rgba(27,42,74,.15)', color: '#1B2A4A', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, marginBottom: '0.75rem', outline: 'none' }}>
                  <option value="">Selecciona tu comuna</option>
                  {communes.map(c => <option key={c.name} value={c.name}>{c.name} — {formatPrice(c.cost)}</option>)}
                </select>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(27,42,74,.5)', marginBottom: 4 }}>
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              {deliveryCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(27,42,74,.5)', marginBottom: 4 }}>
                  <span>Despacho</span><span>{formatPrice(deliveryCost)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem', paddingTop: 8, borderTop: '1px solid rgba(27,42,74,.1)', color: '#1B2A4A' }}>
                <span>Total</span><span style={{ color: '#C8956A' }}>{formatPrice(total)}</span>
              </div>
              <button onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0}
                style={{ width: '100%', background: cart.length === 0 ? 'rgba(27,42,74,.2)' : '#1B2A4A', color: '#F5EDE8', border: 'none', padding: 13, fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', borderRadius: 2 }}>
                Proceder al pago →
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <CheckoutModal cart={cart} total={total} deliveryCost={deliveryCost} orderType={orderType} commune={selectedCommune} selectedPayment={selectedPayment} setSelectedPayment={setSelectedPayment} onConfirm={confirmOrder} onClose={() => setCheckoutOpen(false)} user={user} userProfile={userProfile} />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} user={user} showToast={showToast} />}
      {profileOpen && user && (
        <ProfileModal onClose={() => setProfileOpen(false)} user={user} userProfile={userProfile} showToast={showToast} onProfileUpdate={(p: any) => setUserProfile(p)} />
      )}

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#1B2A4A', border: '1px solid #C8956A', color: '#F5EDE8', padding: '10px 18px', borderRadius: 2, fontSize: '0.82rem', transform: toast ? 'translateY(0)' : 'translateY(80px)', opacity: toast ? 1 : 0, transition: 'all .3s', pointerEvents: 'none' }}>
        {toast}
      </div>
    </div>
  )
}

function CheckoutModal({ cart, total, deliveryCost, orderType, commune, selectedPayment, setSelectedPayment, onConfirm, onClose, user, userProfile }: any) {
  const [form, setForm] = useState({ name: userProfile?.full_name || user?.user_metadata?.full_name || '', phone: userProfile?.phone || '', email: user?.email || '', address: userProfile?.default_address || '', notes: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!form.name || !form.phone) return
    if (orderType === 'delivery' && !form.address) return
    setLoading(true); await onConfirm(form); setLoading(false)
  }

  const inp = { width: '100%', background: '#EEE0D8', border: '1px solid rgba(27,42,74,.15)', color: '#1B2A4A', padding: '9px 12px', fontFamily: 'inherit', fontSize: '0.88rem', borderRadius: 2, outline: 'none' }
  const lbl = { display: 'block', fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(27,42,74,.5)', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(27,42,74,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#F5EDE8', border: '1px solid rgba(27,42,74,.15)', borderRadius: 4, maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(27,42,74,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A' }}>Confirmar Pedido</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ background: '#EEE0D8', padding: '1rem', borderRadius: 2, marginBottom: '1.25rem', fontSize: '0.82rem' }}>
            {cart.map((i: CartItem) => (
              <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(27,42,74,.08)', color: '#1B2A4A' }}>
                <span>{i.product.name} ×{i.quantity}</span>
                <span style={{ color: '#C8956A' }}>{formatPrice(i.product.price * i.quantity)}</span>
              </div>
            ))}
            {deliveryCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#1B2A4A' }}><span>Despacho ({commune})</span><span>{formatPrice(deliveryCost)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 10, color: '#C8956A', fontSize: '1rem' }}>
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>
          {[
            { key: 'name', label: 'Nombre', placeholder: 'Tu nombre', required: true },
            { key: 'phone', label: 'Teléfono', placeholder: '+56 9 XXXX XXXX', required: true },
            { key: 'email', label: 'Email', placeholder: 'tu@email.com', required: false },
            ...(orderType === 'delivery' ? [{ key: 'address', label: 'Dirección de despacho', placeholder: 'Calle, número, depto.', required: true }] : []),
            { key: 'notes', label: 'Notas del pedido', placeholder: 'Sin picante, alergias, etc.', required: false },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <label style={lbl}>{label}{required && ' *'}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={inp} />
            </div>
          ))}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={lbl}>Método de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {(['webpay', 'mercadopago', 'transferencia'] as const).map(m => (
                <button key={m} onClick={() => setSelectedPayment(m)}
                  style={{ background: '#EEE0D8', border: selectedPayment === m ? '2px solid #C8956A' : '1px solid rgba(27,42,74,.15)', color: selectedPayment === m ? '#C8956A' : 'rgba(27,42,74,.6)', padding: '9px 6px', borderRadius: 2, cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {m === 'webpay' ? 'Webpay' : m === 'mercadopago' ? 'MercadoPago' : 'Transferencia'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(27,42,74,.4)' : '#1B2A4A', color: '#F5EDE8', border: 'none', padding: 13, fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', borderRadius: 2 }}>
            {loading ? 'Procesando...' : 'Confirmar Pedido →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthModal({ onClose, user, showToast }: any) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const sb = createClient()

  async function handleGoogleLogin() {
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  async function handleLogin() {
    setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email: form.email, password: form.password })
    setLoading(false)
    if (error) return showToast('Error: ' + error.message)
    showToast('¡Bienvenido/a!'); onClose()
  }

  async function handleRegister() {
    if (!form.full_name || !form.email || !form.password) return showToast('Completa todos los campos')
    if (form.password.length < 8) return showToast('La contraseña debe tener al menos 8 caracteres')
    setLoading(true)
    const { data, error } = await sb.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.full_name } } })
    if (error) { setLoading(false); return showToast('Error: ' + error.message) }
    if (data.user) await sb.from('user_profiles').upsert({ user_id: data.user.id, full_name: form.full_name, email: form.email })
    setLoading(false)
    showToast('✅ ¡Cuenta creada!'); onClose()
  }

  const inp = { width: '100%', background: '#EEE0D8', border: '1px solid rgba(27,42,74,.15)', color: '#1B2A4A', padding: '9px 12px', fontFamily: 'inherit', fontSize: '0.88rem', borderRadius: 2, outline: 'none' }
  const lbl = { display: 'block', fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(27,42,74,.5)', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(27,42,74,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#F5EDE8', border: '1px solid rgba(27,42,74,.15)', borderRadius: 4, maxWidth: 420, width: '100%' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(27,42,74,.1)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A' }}>Mi Cuenta</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(27,42,74,.1)', marginBottom: '1.5rem' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '0.7rem', border: 'none', background: 'none', color: tab === t ? '#C8956A' : 'rgba(27,42,74,.4)', borderBottom: tab === t ? '2px solid #C8956A' : '2px solid transparent', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                {t === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>
          {tab === 'login' ? (
            <>
              {[{ k: 'email', l: 'Email', p: 'tu@email.com', t: 'email' }, { k: 'password', l: 'Contraseña', p: '••••••••', t: 'password' }].map(({ k, l, p, t }) => (
                <div key={k} style={{ marginBottom: '1rem' }}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} style={inp} />
                </div>
              ))}
             <button onClick={handleGoogleLogin}
                style={{ width: '100%', background: '#fff', color: '#1B2A4A', border: '1px solid rgba(27,42,74,.2)', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continuar con Google
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(27,42,74,.35)', margin: '8px 0' }}>— o ingresa con email —</div>
              <button onClick={handleLogin} disabled={loading}
                style={{ width: '100%', background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2 }}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </>
          ) : (
            <>
              <div style={{ background: 'rgba(200,149,106,.08)', border: '1px solid rgba(200,149,106,.2)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.78rem', color: 'rgba(27,42,74,.6)' }}>
                🎁 Al crear tu cuenta podrás recibir descuentos en tus fechas especiales
              </div>
              {[{ k: 'full_name', l: 'Nombre completo *', p: 'Tu nombre', t: 'text' }, { k: 'email', l: 'Email *', p: 'tu@email.com', t: 'email' }, { k: 'password', l: 'Contraseña *', p: 'Mínimo 8 caracteres', t: 'password' }].map(({ k, l, p, t }) => (
                <div key={k} style={{ marginBottom: '1rem' }}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} style={inp} />
                </div>
              ))}
              <button onClick={handleRegister} disabled={loading}
                style={{ width: '100%', background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2 }}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileModal({ onClose, user, userProfile, showToast, onProfileUpdate }: any) {
  const [tab, setTab] = useState<'perfil' | 'fechas' | 'pedidos' | 'timbres'>('perfil')
  const [form, setForm] = useState({ alias: userProfile?.alias || '', full_name: userProfile?.full_name || user?.user_metadata?.full_name || '', phone: userProfile?.phone || '', default_address: userProfile?.default_address || '' })
  const [loading, setLoading] = useState(false)
  const sb = createClient()

  async function handleSave() {
    setLoading(true)
    const { data, error } = await sb.from('user_profiles').upsert({ user_id: user.id, ...form, email: user.email }).select().single()
    setLoading(false)
    if (error) return showToast('Error: ' + error.message)
    onProfileUpdate(data); showToast('✅ Perfil actualizado')
  }

  async function handleLogout() { await sb.auth.signOut(); showToast('Sesión cerrada'); onClose() }

  const inp = { width: '100%', background: '#EEE0D8', border: '1px solid rgba(27,42,74,.15)', color: '#1B2A4A', padding: '9px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none' }
  const lbl = { display: 'block', fontSize: '0.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(27,42,74,.45)', marginBottom: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(27,42,74,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#F5EDE8', border: '1px solid rgba(27,42,74,.15)', borderRadius: 4, maxWidth: 480, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(27,42,74,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#1B2A4A' }}>{form.alias || form.full_name || 'Mi cuenta'}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(27,42,74,.4)', marginTop: 2 }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#1B2A4A', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(27,42,74,.1)', flexShrink: 0 }}>
          {([{ id: 'perfil', label: '👤 Perfil' }, { id: 'fechas', label: '📅 Fechas' }, { id: 'pedidos', label: '📋 Pedidos' }, { id: 'timbres', label: '⭐ Premios' }] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '0.75rem 0.5rem', border: 'none', background: 'none', color: tab === t.id ? '#C8956A' : 'rgba(27,42,74,.4)', borderBottom: tab === t.id ? '2px solid #C8956A' : '2px solid transparent', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {tab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={lbl}>¿Cómo te llamamos? (alias)</label>
                <input value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} placeholder="Ej: Caro, Rodo..." style={inp} />
                <div style={{ fontSize: '0.68rem', color: 'rgba(27,42,74,.35)', marginTop: 4 }}>Este nombre aparece en el menú superior</div>
              </div>
              <div>
                <label style={lbl}>Nombre completo</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Tu nombre completo" style={inp} />
              </div>
              <div>
                <label style={lbl}>Teléfono</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+56 9 XXXX XXXX" style={inp} />
              </div>
              <div>
                <label style={lbl}>Dirección frecuente</label>
                <input value={form.default_address} onChange={e => setForm(f => ({ ...f, default_address: e.target.value }))} placeholder="Calle, número, depto., comuna" style={inp} />
              </div>
              <div style={{ background: 'rgba(200,149,106,.06)', border: '1px solid rgba(200,149,106,.15)', borderRadius: 4, padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'rgba(27,42,74,.55)' }}>
                📅 Tus fechas especiales están en la pestaña <strong>Fechas</strong>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSave} disabled={loading}
                  style={{ flex: 1, background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2 }}>
                  {loading ? 'Guardando...' : '💾 Guardar perfil'}
                </button>
                <button onClick={handleLogout}
                  style={{ background: 'rgba(27,42,74,.08)', color: 'rgba(27,42,74,.5)', border: '1px solid rgba(27,42,74,.15)', padding: '12px 16px', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', fontSize: '0.82rem' }}>
                  Salir
                </button>
              </div>
            </div>
          )}
          {tab === 'fechas' && <FechasPanel userId={user.id} />}
          {tab === 'pedidos' && <OrderHistory userId={user.id} />}
          {tab === 'timbres' && <StampsPanel userId={user.id} />}
        </div>
      </div>
    </div>
  )
}

function OrderHistory({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.from('orders').select('*, order_items(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
    const channel = sb.channel('orders-' + userId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        payload => { setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)) })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [userId])

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    nuevo: { label: '📥 Recibido', color: '#1B2A4A', bg: 'rgba(27,42,74,.08)' },
    preparando: { label: '👨‍🍳 En preparación', color: '#C8956A', bg: 'rgba(200,149,106,.15)' },
    listo: { label: '✅ Listo para retiro', color: '#2D6A4F', bg: 'rgba(45,106,79,.12)' },
    entregado: { label: '🛵 Despachado', color: '#2D6A4F', bg: 'rgba(45,106,79,.12)' },
    cancelado: { label: '❌ Cancelado', color: '#9B2226', bg: 'rgba(155,34,38,.1)' },
  }

  if (loading) return <div style={{ fontSize: '0.78rem', color: 'rgba(27,42,74,.4)', padding: '2rem 0', textAlign: 'center' }}>Cargando pedidos...</div>
  if (orders.length === 0) return <div style={{ fontSize: '0.78rem', color: 'rgba(27,42,74,.4)', padding: '2rem 0', textAlign: 'center' }}>Aún no tienes pedidos.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {orders.map(order => {
        const st = STATUS[order.status] || STATUS['nuevo']
        return (
          <div key={order.id} style={{ background: '#EEE0D8', border: '1px solid rgba(27,42,74,.08)', borderRadius: 4, padding: '0.9rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'Georgia,serif', color: '#C8956A', fontSize: '0.9rem' }}>#{order.order_number}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 2, background: st.bg, color: st.color }}>{st.label}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(order.order_items || []).map((item: any) => (
                <span key={item.id} style={{ fontSize: '0.72rem', background: 'rgba(27,42,74,.08)', padding: '2px 8px', borderRadius: 2, color: 'rgba(27,42,74,.6)' }}>
                  {item.product_name} ×{item.quantity}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(27,42,74,.4)' }}>
              <span>{new Date(order.created_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}</span>
              <span style={{ color: '#C8956A' }}>${order.total?.toLocaleString('es-CL')}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StampsPanel({ userId }: { userId: string }) {
  const [stamps, setStamps] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('loyalty_stamps_v2').select('stamp_type').eq('user_id', userId),
      sb.from('loyalty_config').select('*').single(),
    ]).then(([stampsRes, configRes]) => {
      const stampsData = stampsRes.data || []
      const silver = stampsData.filter((s: any) => s.stamp_type === 'silver').length
      const gold = stampsData.filter((s: any) => s.stamp_type === 'gold').length
      setStamps({ silver, gold })
      setConfig(configRes.data)
      setLoading(false)
    })
  }, [userId])

  async function redeem() {
    const type = silverComplete ? 'silver' : 'gold'
    setRedeeming(true)
    const res = await fetch('/api/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, redeem_type: type }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('✅ ¡Premio canjeado! Muéstralo al retirar.')
      setStamps((prev: any) => ({ ...prev, [type]: 0 }))
    } else setMsg(data.error || 'Error al canjear')
    setRedeeming(false)
    setTimeout(() => setMsg(''), 4000)
  }

  if (loading) return <div style={{ fontSize: '0.78rem', color: 'rgba(27,42,74,.4)', padding: '2rem 0', textAlign: 'center' }}>Cargando...</div>

  const silverCount = stamps?.silver || 0
  const goldCount = stamps?.gold || 0
  const required = 10
  const silverComplete = silverCount >= required
  const goldComplete = goldCount >= required
  const canRedeem = silverComplete || goldComplete
  const reward = silverComplete ? (config?.silver_reward || 'Premio especial') : (config?.gold_reward || 'Premio especial')
  const count = silverComplete ? silverCount : goldCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {msg && (
        <div style={{ background: 'rgba(45,106,79,.12)', border: '1px solid rgba(45,106,79,.3)', borderRadius: 4, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#2D6A4F', textAlign: 'center' }}>{msg}</div>
      )}
      <div style={{ background: 'linear-gradient(135deg, #1B2A4A, #0A1628)', border: '2px solid #C8956A', borderRadius: 8, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '0.95rem', color: '#C8956A', fontWeight: 600 }}>⭐ Tarjeta de Fidelidad</span>
          {canRedeem && <span style={{ fontSize: '0.65rem', background: '#C8956A', color: '#fff', padding: '3px 8px', borderRadius: 2, fontWeight: 700 }}>¡COMPLETO!</span>}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(245,237,232,.35)', marginBottom: '1rem' }}>
          Plata: {silverCount}/{required} · Oro: {goldCount}/{required}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: '0.75rem' }}>
          {Array.from({ length: required }).map((_, i) => (
            <div key={i} style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: i < Math.max(silverCount, goldCount) ? '#C8956A' : 'rgba(245,237,232,.08)', border: i < Math.max(silverCount, goldCount) ? '2px solid #C8956A' : '2px solid rgba(245,237,232,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < Math.max(silverCount, goldCount) ? '0.85rem' : '0.55rem', color: i < Math.max(silverCount, goldCount) ? '#fff' : 'rgba(245,237,232,.2)' }}>
              {i < Math.max(silverCount, goldCount) ? '🍣' : '○'}
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(245,237,232,.08)', borderRadius: 2, height: 4, marginBottom: 6 }}>
          <div style={{ background: '#C8956A', height: '100%', borderRadius: 2, width: `${Math.min(Math.max(silverCount, goldCount) / required, 1) * 100}%`, transition: 'width .5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(245,237,232,.4)', marginBottom: '0.75rem' }}>
          <span>{Math.max(silverCount, goldCount)} de {required}</span>
          <span>{!canRedeem ? `Faltan ${required - Math.max(silverCount, goldCount)}` : '¡Listo para canjear!'}</span>
        </div>
        <div style={{ background: canRedeem ? 'rgba(200,149,106,.12)' : 'rgba(245,237,232,.04)', border: `1px solid ${canRedeem ? '#C8956A' : 'rgba(245,237,232,.08)'}`, borderRadius: 4, padding: '0.75rem', marginBottom: canRedeem ? '0.75rem' : 0 }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '.08em', textTransform: 'uppercase', color: canRedeem ? '#C8956A' : 'rgba(245,237,232,.3)', marginBottom: 4 }}>
            🎁 {canRedeem ? '¡Premio disponible!' : 'Premio al completar'}
          </div>
          <div style={{ fontSize: '0.85rem', color: canRedeem ? '#F5EDE8' : 'rgba(245,237,232,.4)' }}>{reward}</div>
        </div>
        {canRedeem && (
          <button onClick={redeem} disabled={redeeming}
            style={{ width: '100%', background: '#C8956A', color: '#fff', border: 'none', padding: '10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.75rem' }}>
            {redeeming ? 'Canjeando...' : '🎁 Canjear Premio'}
          </button>
        )}
      </div>
      {config?.double_min && (
        <div style={{ background: 'rgba(27,42,74,.04)', border: '1px solid rgba(27,42,74,.1)', borderRadius: 4, padding: '0.75rem 1rem', fontSize: '0.72rem', color: 'rgba(27,42,74,.5)', textAlign: 'center' }}>
          💎 Pedidos sobre ${config.double_min?.toLocaleString('es-CL')} suman timbre plata + oro
        </div>
      )}
    </div>
  )
}

function FechasPanel({ userId }: { userId: string }) {
  const [fechas, setFechas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ label: '', date: '', type: 'special' })
  const [msg, setMsg] = useState('')

  const TIPOS = [
    { value: 'birthday', label: '🎂 Cumpleaños' },
    { value: 'anniversary', label: '💕 Aniversario pololeo' },
    { value: 'wedding', label: '💍 Aniversario matrimonio' },
    { value: 'special', label: '✨ Fecha especial' },
  ]

  useEffect(() => {
    const sb = createClient()
    sb.from('user_special_dates').select('*').eq('user_id', userId).order('created_at', { ascending: true })
      .then(({ data }) => { setFechas(data || []); setLoading(false) })
  }, [userId])

  async function addFecha() {
    if (!form.label || !form.date) return
    if (fechas.length >= 5) { setMsg('Has alcanzado el máximo de 5 fechas especiales.'); return }
    setSaving(true)
    const sb = createClient()
    const { data, error } = await sb.from('user_special_dates').insert({ user_id: userId, label: form.label, date: form.date, type: form.type }).select().single()
    if (!error && data) {
      setFechas(prev => [...prev, data])
      setForm({ label: '', date: '', type: 'special' })
      setMsg('✅ Fecha agregada correctamente')
      setTimeout(() => setMsg(''), 3000)
    }
    setSaving(false)
  }

  const inp = { width: '100%', background: '#EEE0D8', border: '1px solid rgba(27,42,74,.15)', color: '#1B2A4A', padding: '9px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none' }
  const lbl = { display: 'block', fontSize: '0.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(27,42,74,.45)', marginBottom: 4 }

  if (loading) return <div style={{ textAlign: 'center', color: 'rgba(27,42,74,.4)', padding: '2rem 0' }}>Cargando fechas...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'rgba(27,42,74,.5)', background: 'rgba(200,149,106,.06)', border: '1px solid rgba(200,149,106,.15)', borderRadius: 4, padding: '0.75rem 1rem' }}>
        🎁 Agrega tus fechas para recibir descuentos automáticos. Máximo 5 fechas. Una vez agregadas no pueden modificarse.
      </div>
      {msg && (
        <div style={{ background: msg.includes('✅') ? 'rgba(45,106,79,.1)' : 'rgba(155,34,38,.1)', border: `1px solid ${msg.includes('✅') ? 'rgba(45,106,79,.25)' : 'rgba(155,34,38,.2)'}`, borderRadius: 4, padding: '0.6rem 1rem', fontSize: '0.78rem', color: msg.includes('✅') ? '#2D6A4F' : '#9B2226' }}>
          {msg}
        </div>
      )}
      {fechas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fechas.map(fecha => {
            const tipo = TIPOS.find(t => t.value === fecha.type)
            return (
              <div key={fecha.id} style={{ background: '#EEE0D8', border: '1px solid rgba(27,42,74,.08)', borderRadius: 4, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1B2A4A' }}>{tipo?.label} — {fecha.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(27,42,74,.45)', marginTop: 2 }}>
                    {new Date(fecha.date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', background: 'rgba(27,42,74,.08)', color: 'rgba(27,42,74,.4)', padding: '2px 8px', borderRadius: 2 }}>🔒 Fija</span>
              </div>
            )
          })}
        </div>
      )}
      {fechas.length < 5 ? (
        <div style={{ background: '#F5EDE8', border: '1px solid rgba(27,42,74,.1)', borderRadius: 4, padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '0.75rem', fontWeight: 600 }}>
            + Agregar fecha ({fechas.length}/5)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={lbl}>Tipo de fecha</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Nombre o descripción</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: Mi cumpleaños, Graduación..." style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <button onClick={addFecha} disabled={saving || !form.label || !form.date}
              style={{ background: saving || !form.label || !form.date ? 'rgba(27,42,74,.3)' : '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '10px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }}>
              {saving ? 'Guardando...' : '+ Agregar fecha'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(27,42,74,.4)', padding: '0.5rem' }}>
          Has agregado el máximo de 5 fechas. Para eliminar alguna, contacta al local.
        </div>
      )}
    </div>
  )
}