'use client'
// app/page.tsx — Página principal de Sushi La Reina

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { Product, Category, CartItem, DeliveryCommune } from '@/types'

// ─── Hooks ────────────────────────────────────────────────────
function useMenu() {
  const [categories, setCategories]   = useState<Category[]>([])
  const [products, setProducts]       = useState<Record<number, Product[]>>({})
  const [communes, setCommunes]       = useState<DeliveryCommune[]>([])
  const [loading, setLoading]         = useState(true)

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
      setCategories(catData)
      setProducts(grouped)
      setCommunes(config.data?.value || [])
      setLoading(false)
    })
  }, [])

  return { categories, products, communes, loading }
}

// ─── Main Component ───────────────────────────────────────────
export default function HomePage() {
  const { categories, products, communes, loading } = useMenu()
  const [activeTab, setActiveTab]     = useState<number | null>(null)
  const [cart, setCart]               = useState<CartItem[]>([])
  const [cartOpen, setCartOpen]       = useState(false)
  const [orderType, setOrderType]     = useState<'retiro' | 'delivery'>('retiro')
  const [selectedCommune, setSelectedCommune] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [authOpen, setAuthOpen]       = useState(false)
  const [user, setUser]               = useState<any>(null)
  const [toast, setToast]             = useState('')
  const [selectedPayment, setSelectedPayment] = useState<'webpay' | 'mercadopago' | 'transferencia'>('webpay')

  const menuRef = useRef<HTMLElement>(null)

  // Set first tab on load
  useEffect(() => {
    if (categories.length > 0 && activeTab === null) {
      setActiveTab(categories[0].id)
    }
  }, [categories])

  // Auth listener
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Toast helper
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  // Cart functions
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
    setCart(prev => prev.map(i => i.product.id === productId
      ? { ...i, quantity: i.quantity + delta }
      : i
    ).filter(i => i.quantity > 0))
  }

  const cartCount   = cart.reduce((a, i) => a + i.quantity, 0)
  const subtotal    = cart.reduce((a, i) => a + i.product.price * i.quantity, 0)
  const deliveryCost = orderType === 'delivery'
    ? communes.find(c => c.name === selectedCommune)?.cost || 0 : 0
  const total = subtotal + deliveryCost

  // Confirm order
  async function confirmOrder(formData: {
    name: string; phone: string; email?: string; address?: string; notes?: string
  }) {
    if (cart.length === 0) return showToast('Agrega items al carrito')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email,
          user_id: user?.id,
          order_type: orderType,
          delivery_address: formData.address,
          commune: selectedCommune,
          items: cart.map(i => ({
            product_id: i.product.id,
            product_name: i.product.name,
            unit_price: i.product.price,
            quantity: i.quantity,
          })),
          payment_method: selectedPayment,
          notes: formData.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Abrir pago o WhatsApp según método
      if (data.paymentUrl && selectedPayment !== 'transferencia') {
        window.open(data.paymentUrl, '_blank')
      } else {
        openWSPOrder(data.order, formData)
      }

      setCart([])
      setCartOpen(false)
      setCheckoutOpen(false)
      showToast('✅ ¡Pedido enviado con éxito!')
    } catch (err: any) {
      showToast('Error al crear el pedido: ' + err.message)
    }
  }

  function openWSPOrder(order: any, form: any) {
    const items = cart.map(i => `• ${i.product.name} ×${i.quantity} = ${formatPrice(i.product.price * i.quantity)}`).join('\n')
    const msg = `🍣 *Pedido #${order.order_number}*\n\n*Cliente:* ${form.name}\n*Tel:* ${form.phone}\n*Tipo:* ${orderType === 'retiro' ? 'Retiro' : `Delivery a ${form.address}, ${selectedCommune}`}\n\n*Pedido:*\n${items}\n\n*Total: ${formatPrice(total)}*\n*Pago:* ${selectedPayment.toUpperCase()}\n\n_sushilareina.cl_`
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '56971061232'}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 1000,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#C8001C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍣</div>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', letterSpacing: '.05em' }}>Sushi La Reina</span>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ color: 'rgba(245,240,232,0.55)', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Carta
          </a>
          <a onClick={() => { menuRef.current?.scrollIntoView({ behavior: 'smooth' }); setActiveTab(categories.find(c => c.slug === 'promociones')?.id || null) }}
            style={{ color: 'rgba(245,240,232,0.55)', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Promociones
          </a>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setAuthOpen(true)}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#F5F0E8', padding: '7px 16px', borderRadius: 2, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            {user ? '👤 Mi cuenta' : 'Ingresar'}
          </button>
          <button onClick={() => setCartOpen(true)}
            style={{ background: '#C8001C', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 2, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
            🛒 Carrito
            {cartCount > 0 && (
              <span style={{ background: '#fff', color: '#C8001C', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(200,0,28,.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(212,160,23,.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)', backgroundSize: '60px 60px', opacity: .4 }} />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 680, padding: '0 2rem', animation: 'fadeUp 1s ease both' }}>
          <div style={{ display: 'inline-block', border: '1px solid #D4A017', color: '#D4A017', padding: '5px 20px', fontSize: '0.7rem', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: '2rem' }}>
            Lynch Sur #17 · La Reina · Santiago
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(3rem,8vw,6rem)', fontWeight: 700, lineHeight: .95, marginBottom: '1.5rem' }}>
            Sushi<br /><em style={{ color: '#D4A017' }}>La Reina</em>
          </h1>
          <p style={{ color: 'rgba(245,240,232,.5)', fontSize: '1rem', letterSpacing: '.04em', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Fusión japonesa · Rolls · Nikkei · Ceviches<br />
            Retiro y delivery en La Reina y comunas vecinas
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: '#C8001C', color: '#fff', border: 'none', padding: '14px 36px', fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
              Ver la Carta
            </button>
            <button onClick={() => window.open('https://wa.me/56971061232', '_blank')}
              style={{ background: 'transparent', color: '#F5F0E8', border: '1px solid rgba(245,240,232,.25)', padding: '14px 36px', fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
              📱 WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* ── MENU ─────────────────────────────────────────── */}
      <section ref={menuRef} style={{ padding: '5rem 2rem 4rem', maxWidth: 1400, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, marginBottom: '.5rem' }}>
          Nuestra <em style={{ color: '#D4A017' }}>Carta</em>
        </h2>
        <p style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.8rem', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
          Rolls · Ceviches · Especiales · Postres
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,.07)', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '2.5rem' }}>
          {loading
            ? [1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ width: 100, height: 40, flexShrink: 0, margin: '0 1px' }} />)
            : categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)}
                style={{
                  padding: '1rem 1.25rem', cursor: 'pointer', fontSize: '0.75rem',
                  letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  background: 'none', fontFamily: 'inherit',
                  color: activeTab === cat.id ? '#D4A017' : 'rgba(245,240,232,.4)',
                  borderBottom: activeTab === cat.id ? '2px solid #D4A017' : '2px solid transparent',
                  borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                  transition: 'all .2s',
                }}>
                {cat.name}
              </button>
            ))
          }
        </div>

        {/* Active page */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 1.5 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 130 }} />)}
          </div>
        ) : categories.map(cat => activeTab === cat.id && (
          <div key={cat.id} style={{ animation: 'pageFlip .4s ease both' }}>
            {/* Featured promo banner */}
            {cat.slug === 'promociones' && (products[cat.id] || []).filter(p => p.featured)[0] && (() => {
              const featured = (products[cat.id] || []).filter(p => p.featured)[0]
              return (
                <div onClick={() => addToCart(featured)} style={{
                  background: 'linear-gradient(135deg,#C8001C,#8B0010)',
                  borderRadius: 4, padding: '1.5rem 2rem', marginBottom: '1.5rem',
                  display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '2rem',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                }}>
                  <div>
                    <div style={{ background: '#D4A017', color: '#0A0A0A', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 10px', display: 'inline-block', marginBottom: 8 }}>Más Popular</div>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.4rem', fontWeight: 700 }}>{featured.name}</div>
                    <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '0.82rem', marginTop: 4 }}>{featured.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: '2rem', fontWeight: 700 }}>{formatPrice(featured.price)}</div>
                    <button style={{ background: '#fff', color: '#C8001C', border: 'none', padding: '8px 18px', borderRadius: 2, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
                      Agregar →
                    </button>
                  </div>
                </div>
              )
            })()}

            {cat.slug !== 'promociones' && (
              <div style={{ color: 'rgba(245,240,232,.35)', fontSize: '0.78rem', letterSpacing: '.08em', fontStyle: 'italic', marginBottom: '1rem' }}>
                {cat.name}
                {cat.slug === 'california' && ' — Envuelto en sésamo o ciboulette'}
                {cat.slug === 'avocado' && ' — Envuelto en salmón +$1.000'}
                {cat.slug === 'hotrolls' && ' — Tempura caliente'}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(275px,1fr))', gap: 1.5, background: 'rgba(255,255,255,.04)' }}>
              {(products[cat.id] || []).filter(p => !(cat.slug === 'promociones' && p.featured)).map(product => (
                <div key={product.id} onClick={() => addToCart(product)}
                  style={{ background: '#111', padding: '1.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'background .2s', position: 'relative' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#111')}>
                  {product.badge && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: product.badge.includes('Vegan') ? '#00a03c' : '#C8001C', color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '.1em', padding: '2px 8px', textTransform: 'uppercase' }}>
                      {product.badge}
                    </span>
                  )}
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, paddingRight: product.badge ? 60 : 0 }}>{product.name}</div>
                  {product.description && <div style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,.38)', lineHeight: 1.5, flex: 1 }}>{product.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div>
                      <div style={{ color: '#D4A017', fontWeight: 600 }}>{formatPrice(product.price)}</div>
                      {product.portions && <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.28)', letterSpacing: '.06em' }}>{product.portions}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); addToCart(product) }}
                      style={{ background: '#C8001C', color: '#fff', border: 'none', width: 30, height: 30, borderRadius: 2, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,.05)', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.4rem', color: '#D4A017', marginBottom: 8 }}>Sushi La Reina</div>
        <div style={{ color: 'rgba(245,240,232,.3)', fontSize: '0.8rem', lineHeight: 1.9 }}>
          Lynch Sur #17 · La Reina · Santiago<br />
          +56 9 7106 1232 · sushilareina.cl<br />
          @sushilareina_ · /sushilareina
        </div>
      </footer>

      {/* ── WSP FLOAT ────────────────────────────────────── */}
      <button onClick={() => window.open('https://wa.me/56971061232', '_blank')}
        style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 900, background: '#25D366', border: 'none', borderRadius: '50%', width: 52, height: 52, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 16px rgba(37,211,102,.35)' }}>
        💬
      </button>

      {/* ── CART SIDEBAR ─────────────────────────────────── */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
          <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 400, background: '#111', borderLeft: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem' }}>Tu Pedido</span>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: '#F5F0E8', fontSize: '1.4rem', cursor: 'pointer', opacity: .5 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cart.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(245,240,232,.3)', padding: '3rem 0', fontSize: '0.85rem' }}>Tu carrito está vacío</div>
                : cart.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', background: 'rgba(255,255,255,.03)', borderRadius: 2 }}>
                    <div style={{ flex: 1, fontSize: '0.85rem' }}>{item.product.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => changeQty(item.product.id, -1)} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#F5F0E8', width: 22, height: 22, cursor: 'pointer', borderRadius: 2, fontSize: '0.9rem' }}>−</button>
                      <span style={{ fontSize: '0.85rem', minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => changeQty(item.product.id, 1)} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#F5F0E8', width: 22, height: 22, cursor: 'pointer', borderRadius: 2, fontSize: '0.9rem' }}>+</button>
                    </div>
                    <div style={{ color: '#D4A017', fontWeight: 600, fontSize: '0.85rem', minWidth: 64, textAlign: 'right' }}>{formatPrice(item.product.price * item.quantity)}</div>
                  </div>
                ))
              }
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,.07)' }}>
              {/* Retiro / Delivery */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,.04)', marginBottom: '0.75rem' }}>
                {(['retiro', 'delivery'] as const).map(t => (
                  <button key={t} onClick={() => setOrderType(t)}
                    style={{ padding: '0.6rem', border: 'none', fontFamily: 'inherit', fontSize: '0.75rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', background: orderType === t ? '#C8001C' : '#111', color: '#F5F0E8' }}>
                    {t === 'retiro' ? '🏪 Retiro' : '🛵 Delivery'}
                  </button>
                ))}
              </div>

              {orderType === 'delivery' && (
                <select value={selectedCommune} onChange={e => setSelectedCommune(e.target.value)}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, marginBottom: '0.75rem', outline: 'none' }}>
                  <option value="">Selecciona tu comuna</option>
                  {communes.map(c => <option key={c.name} value={c.name}>{c.name} — {formatPrice(c.cost)}</option>)}
                </select>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(245,240,232,.5)', marginBottom: 4 }}>
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              {deliveryCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(245,240,232,.5)', marginBottom: 4 }}>
                  <span>Despacho</span><span>{formatPrice(deliveryCost)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <span>Total</span><span style={{ color: '#D4A017' }}>{formatPrice(total)}</span>
              </div>
              <button onClick={() => { setCheckoutOpen(true) }}
                disabled={cart.length === 0}
                style={{ width: '100%', background: cart.length === 0 ? '#333' : '#C8001C', color: '#fff', border: 'none', padding: 13, fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', borderRadius: 2 }}>
                Proceder al pago →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ───────────────────────────────── */}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart} total={total} deliveryCost={deliveryCost}
          orderType={orderType} commune={selectedCommune}
          selectedPayment={selectedPayment} setSelectedPayment={setSelectedPayment}
          onConfirm={confirmOrder} onClose={() => setCheckoutOpen(false)}
          user={user}
        />
      )}

      {/* ── AUTH MODAL ───────────────────────────────────── */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} user={user} showToast={showToast} />}

      {/* ── TOAST ────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: '#111', border: '1px solid #D4A017', color: '#F5F0E8',
        padding: '10px 18px', borderRadius: 2, fontSize: '0.82rem',
        transform: toast ? 'translateY(0)' : 'translateY(80px)',
        opacity: toast ? 1 : 0, transition: 'all .3s', pointerEvents: 'none',
      }}>
        {toast}
      </div>
    </div>
  )
}

// ─── Checkout Modal ───────────────────────────────────────────
function CheckoutModal({ cart, total, deliveryCost, orderType, commune, selectedPayment, setSelectedPayment, onConfirm, onClose, user }: any) {
  const [form, setForm] = useState({ name: user?.user_metadata?.full_name || '', phone: '', email: user?.email || '', address: '', notes: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!form.name || !form.phone) return
    if (orderType === 'delivery' && !form.address) return
    setLoading(true)
    await onConfirm(form)
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem' }}>Confirmar Pedido</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#F5F0E8', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {/* Resumen */}
          <div style={{ background: 'rgba(255,255,255,.03)', padding: '1rem', borderRadius: 2, marginBottom: '1.25rem', fontSize: '0.82rem' }}>
            {cart.map((i: CartItem) => (
              <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span>{i.product.name} ×{i.quantity}</span>
                <span style={{ color: '#D4A017' }}>{formatPrice(i.product.price * i.quantity)}</span>
              </div>
            ))}
            {deliveryCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Despacho ({commune})</span><span>{formatPrice(deliveryCost)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 10, color: '#D4A017', fontSize: '1rem' }}>
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Datos */}
          {[
            { key: 'name', label: 'Nombre', placeholder: 'Tu nombre', required: true },
            { key: 'phone', label: 'Teléfono', placeholder: '+56 9 XXXX XXXX', required: true },
            { key: 'email', label: 'Email (para confirmación)', placeholder: 'tu@email.com', required: false },
            ...(orderType === 'delivery' ? [{ key: 'address', label: 'Dirección de despacho', placeholder: 'Calle, número, depto.', required: true }] : []),
            { key: 'notes', label: 'Notas del pedido', placeholder: 'Sin picante, alergias, etc.', required: false },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 5 }}>{label}{required && ' *'}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '9px 12px', fontFamily: 'inherit', fontSize: '0.88rem', borderRadius: 2, outline: 'none' }} />
            </div>
          ))}

          {/* Método de pago */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 8 }}>Método de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {(['webpay', 'mercadopago', 'transferencia'] as const).map(m => (
                <button key={m} onClick={() => setSelectedPayment(m)}
                  style={{ background: 'rgba(255,255,255,.04)', border: selectedPayment === m ? '1px solid #D4A017' : '1px solid rgba(255,255,255,.08)', color: selectedPayment === m ? '#D4A017' : 'rgba(245,240,232,.6)', padding: '9px 6px', borderRadius: 2, cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '.05em', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {m === 'webpay' ? 'Webpay' : m === 'mercadopago' ? 'MercadoPago' : 'Transferencia'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', background: loading ? '#555' : '#C8001C', color: '#fff', border: 'none', padding: 13, fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', borderRadius: 2 }}>
            {loading ? 'Procesando...' : 'Confirmar Pedido →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────
function AuthModal({ onClose, user, showToast }: any) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', phone: '',
    birth_date: '', anniversary_date: '', wedding_date: '',
    special_date_1: '', special_date_1_label: '',
    special_date_2: '', special_date_2_label: '',
    marketing_consent: true,
  })
  const [loading, setLoading] = useState(false)
  const sb = createClient()

  async function handleLogin() {
    setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email: form.email, password: form.password })
    setLoading(false)
    if (error) return showToast('Error: ' + error.message)
    showToast('¡Bienvenido/a!'); onClose()
  }

  async function handleRegister() {
    if (!form.full_name || !form.email || !form.password) return showToast('Completa los campos requeridos')
    setLoading(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return showToast(data.error || 'Error al registrarse')
    showToast('✅ Cuenta creada. ¡Bienvenido/a!'); onClose()
  }

  async function handleLogout() {
    await sb.auth.signOut(); showToast('Sesión cerrada'); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem' }}>Mi Cuenta</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#F5F0E8', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>✕</button>
        </div>

        {user ? (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', marginBottom: 4 }}>{user.user_metadata?.full_name || user.email}</div>
            <div style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>{user.email}</div>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.06)', color: '#F5F0E8', border: '1px solid rgba(255,255,255,.08)', padding: '10px 24px', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', fontSize: '0.82rem' }}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div style={{ padding: '1.5rem' }}>
            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: '1.5rem' }}>
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '0.7rem', border: 'none', background: 'none', color: tab === t ? '#D4A017' : 'rgba(245,240,232,.4)', borderBottom: tab === t ? '2px solid #D4A017' : '2px solid transparent', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                  {t === 'login' ? 'Ingresar' : 'Registrarse'}
                </button>
              ))}
            </div>

            {tab === 'login' ? (
              <>
                {[{ k: 'email', l: 'Email', p: 'tu@email.com', t: 'email' }, { k: 'password', l: 'Contraseña', p: '••••••••', t: 'password' }].map(({ k, l, p, t }) => (
                  <div key={k} style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 5 }}>{l}</label>
                    <input type={t} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p}
                      style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '9px 12px', fontFamily: 'inherit', fontSize: '0.88rem', borderRadius: 2, outline: 'none' }} />
                  </div>
                ))}
                <button onClick={handleLogin} disabled={loading}
                  style={{ width: '100%', background: '#C8001C', color: '#fff', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </>
            ) : (
              <>
                {/* Campos obligatorios */}
                {[
                  { k: 'full_name', l: 'Nombre completo *', p: 'Tu nombre', t: 'text' },
                  { k: 'email', l: 'Email *', p: 'tu@email.com', t: 'email' },
                  { k: 'password', l: 'Contraseña *', p: 'Mínimo 8 caracteres', t: 'password' },
                  { k: 'phone', l: 'Teléfono', p: '+56 9 XXXX XXXX', t: 'tel' },
                ].map(({ k, l, p, t }) => (
                  <div key={k} style={{ marginBottom: '0.9rem' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 4 }}>{l}</label>
                    <input type={t} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p}
                      style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none' }} />
                  </div>
                ))}

                {/* Fechas especiales */}
                <div style={{ background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.15)', borderRadius: 4, padding: '1rem', margin: '1rem 0' }}>
                  <div style={{ color: '#D4A017', fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    🎉 Tus fechas especiales (para recibir descuentos)
                  </div>
                  {[
                    { k: 'birth_date', l: '🎂 Cumpleaños' },
                    { k: 'anniversary_date', l: '💑 Aniversario de pololeo' },
                    { k: 'wedding_date', l: '💍 Aniversario de matrimonio' },
                  ].map(({ k, l }) => (
                    <div key={k} style={{ marginBottom: '0.7rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(245,240,232,.45)', marginBottom: 3 }}>{l}</label>
                      <input type="date" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '7px 10px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, outline: 'none' }} />
                    </div>
                  ))}
                  {/* Fecha personalizada 1 */}
                  <div style={{ marginBottom: '0.7rem' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(245,240,232,.45)', marginBottom: 3 }}>✨ Fecha especial 1 (ej: graduación, día del padre)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input type="date" value={form.special_date_1} onChange={e => setForm(f => ({ ...f, special_date_1: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '7px 10px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, outline: 'none' }} />
                      <input type="text" value={form.special_date_1_label} onChange={e => setForm(f => ({ ...f, special_date_1_label: e.target.value }))} placeholder="Nombre de la fecha"
                        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '7px 10px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, outline: 'none' }} />
                    </div>
                  </div>
                  {/* Fecha personalizada 2 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(245,240,232,.45)', marginBottom: 3 }}>✨ Fecha especial 2</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input type="date" value={form.special_date_2} onChange={e => setForm(f => ({ ...f, special_date_2: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '7px 10px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, outline: 'none' }} />
                      <input type="text" value={form.special_date_2_label} onChange={e => setForm(f => ({ ...f, special_date_2_label: e.target.value }))} placeholder="Nombre de la fecha"
                        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '7px 10px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, outline: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* Consentimiento */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '1rem', fontSize: '0.78rem', color: 'rgba(245,240,232,.5)' }}>
                  <input type="checkbox" checked={form.marketing_consent} onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))} />
                  Acepto recibir descuentos y promociones por email
                </label>

                <button onClick={handleRegister} disabled={loading}
                  style={{ width: '100%', background: '#C8001C', color: '#fff', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
