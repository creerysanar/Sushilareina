'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [creds, setCreds] = useState({ user: '', pass: '' })
  const [error, setError] = useState('')
  const [section, setSection] = useState('pedidos')
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    stamps_required: 10,
    reward_description: '',
    min_order: 0,
    reward: 'Premio al completar la tarjeta',
    double_min: 40000,
  })
  const [uploading, setUploading] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [celebConfig, setCelebConfig] = useState({ birthday: 15, anniversary: 12, wedding: 15, special: 10 })
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [newProduct, setNewProduct] = useState<any | null>(null)

  async function login() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: creds.user, pass: creds.pass }),
    })
    if (res.ok) { setAuthed(true); loadData() }
    else { setError('Credenciales incorrectas'); setTimeout(() => setError(''), 3000) }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function loadData() {
    const sb = createClient()
    const [prodsRes, catsRes, loyaltyRes, celebRes, ordersRes] = await Promise.all([
      sb.from('products').select('*').order('category_id').order('sort_order'),
      sb.from('categories').select('*').order('sort_order'),
      sb.from('loyalty_config').select('*').single(),
      sb.from('celebration_discounts').select('*').eq('id', 1).single(),
      sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200),
    ])
    setProducts(prodsRes.data || [])
    setCategories(catsRes.data || [])
    if (loyaltyRes.data) {
      const d = loyaltyRes.data
      setLoyaltyConfig({
        stamps_required: d.stamps_required || d.silver_required || 10,
        reward_description: d.reward_description || '',
        min_order: d.min_order || d.silver_min || 0,
        reward: d.reward || d.silver_reward || 'Premio al completar la tarjeta',
        double_min: d.double_min || 40000,
      })
    }
    if (celebRes.data) setCelebConfig(celebRes.data)
    setOrders(ordersRes.data || [])
  }

  async function uploadImage(productId: string, file: File) {
    setUploading(productId)
    const sb = createClient()
    const ext = file.name.split('.').pop()
    const path = `products/${productId}.${ext}`
    const { error } = await sb.storage.from('menu-images').upload(path, file, { upsert: true })
    if (error) { showToast('Error subiendo imagen'); setUploading(null); return }
    const { data: { publicUrl } } = sb.storage.from('menu-images').getPublicUrl(path)
    await sb.from('products').update({ image_url: publicUrl }).eq('id', productId)
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_url: publicUrl } : p))
    setUploading(null)
    showToast('Imagen actualizada')
  }

  async function saveProduct(product: any) {
    setSaving(true)
    const sb = createClient()
    await sb.from('products').update({
      name: product.name, description: product.description,
      price: product.price, portions: product.portions, badge: product.badge,
    }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...product } : p))
    setEditingProduct(null)
    setSaving(false)
    showToast('Producto actualizado')
  }

  async function addProduct(categoryId: number) {
    if (!newProduct?.name || !newProduct?.price) return showToast('Nombre y precio son requeridos')
    setSaving(true)
    const sb = createClient()
    const { data, error } = await sb.from('products').insert({
      category_id: categoryId,
      name: newProduct.name,
      description: newProduct.description || '',
      price: parseInt(newProduct.price),
      portions: newProduct.portions || '',
      badge: newProduct.badge || '',
      active: true,
    }).select().single()
    if (!error && data) { setProducts(prev => [...prev, data]); showToast('Producto agregado') }
    setNewProduct(null)
    setSaving(false)
  }

  async function toggleProduct(productId: string, active: boolean) {
    const sb = createClient()
    await sb.from('products').update({ active }).eq('id', productId)
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, active } : p))
    showToast(active ? 'Producto activado' : 'Producto desactivado')
  }

  async function saveLoyaltyConfig() {
    setSaving(true)
    const sb = createClient()
    await sb.from('loyalty_config').update({
      stamps_required: loyaltyConfig.stamps_required,
      silver_required: loyaltyConfig.stamps_required,
      reward_description: loyaltyConfig.reward,
      silver_reward: loyaltyConfig.reward,
      reward: loyaltyConfig.reward,
      silver_min: loyaltyConfig.min_order,
      min_order: loyaltyConfig.min_order,
      double_min: loyaltyConfig.double_min,
    }).eq('id', 1)
    setSaving(false)
    showToast('Configuracion guardada')
  }

  async function validateQR(qrCode: string) {
    const res = await fetch('/api/loyalty', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_code: qrCode }),
    })
    const data = await res.json()
    if (res.ok) showToast('Premio canjeado correctamente')
    else showToast('Error: ' + (data.error || 'QR invalido'))
  }

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '2.5rem', width: 360 }}>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.4rem', color: '#C8956A', marginBottom: '.5rem' }}>Admin</div>
        <div style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Sushi La Reina</div>
        {[{ k: 'user', l: 'Usuario', t: 'text' }, { k: 'pass', l: 'Contrasena', t: 'password' }].map(({ k, l, t }) => (
          <div key={k} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 5 }}>{l}</label>
            <input type={t} value={(creds as any)[k]} onChange={e => setCreds(c => ({ ...c, [k]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '10px 14px', fontFamily: 'inherit', fontSize: '0.9rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        {error && <div style={{ color: '#ff4455', fontSize: '0.8rem', marginBottom: 10 }}>{error}</div>}
        <button onClick={login} style={{ width: '100%', background: '#1B2A4A', color: '#fff', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2, marginTop: 4 }}>
          Entrar
        </button>
      </div>
    </div>
  )

  // ✅ CAMBIO 1: Agregado 'emails' en navItems después de 'bot'
  const navItems = [
    { id: 'pedidos',     label: 'Pedidos' },
    // { id: 'ventas',      label: 'Ventas' },  // ELIMINADO
    { id: 'cupones',     label: 'Cupones' },
    { id: 'productos',   label: 'Productos y Fotos' },
    { id: 'promociones', label: 'Promociones' },
    { id: 'descuentos',  label: 'Descuentos Celebracion' },
    { id: 'timbres',     label: 'Tarjeta Timbres' },
    { id: 'clientes',    label: 'Clientes' },
    { id: 'canjear',     label: 'Canjear Premio' },
    { id: 'bot',         label: 'Bot WhatsApp' },
    { id: 'emails',      label: 'Emails' },  // ✅ NUEVO
    { id: 'contenido',   label: 'Contenido' },
  ]

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,.6)', marginBottom: 4 }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', fontFamily: 'sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#111', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', color: '#C8956A' }}>Sushi La Reina</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(245,240,232,.3)', marginTop: 2 }}>Panel Admin</div>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              style={{ width: '100%', padding: '0.75rem 1.5rem', background: section === item.id ? 'rgba(200,149,106,.12)' : 'none', border: 'none', borderLeft: section === item.id ? '3px solid #C8956A' : '3px solid transparent', color: section === item.id ? '#F5F0E8' : 'rgba(245,240,232,.45)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', textAlign: 'left' }}>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <button onClick={() => window.location.href = '/'} style={{ background: 'none', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(245,240,232,.5)', padding: '7px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', width: '100%' }}>
            Ver sitio
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 220, flex: 1, padding: '2rem', color: '#F5F0E8' }}>

        {/* MODAL EDITAR PRODUCTO */}
        {editingProduct && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem' }}>Editar Producto</span>
                <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: '#F5F0E8', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>X</button>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { k: 'name', l: 'Nombre *', p: 'Nombre del producto' },
                  { k: 'description', l: 'Descripcion', p: 'Ingredientes y descripcion' },
                  { k: 'portions', l: 'Porciones', p: 'Ej: 10 CORTES' },
                  { k: 'badge', l: 'Badge/Etiqueta', p: 'Ej: PROMO, Nikkei, Veggie' },
                ].map(({ k, l, p }) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <input value={editingProduct[k] || ''} onChange={e => setEditingProduct((ep: any) => ({ ...ep, [k]: e.target.value }))}
                      placeholder={p} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Precio *</label>
                  <input type="number" value={editingProduct.price || ''} onChange={e => setEditingProduct((ep: any) => ({ ...ep, price: parseInt(e.target.value) }))}
                    placeholder="9990" style={{ ...inputStyle, color: '#C8956A' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => saveProduct(editingProduct)} disabled={saving}
                    style={{ flex: 1, background: '#C8956A', color: '#fff', border: 'none', padding: 12, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2 }}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button onClick={() => setEditingProduct(null)}
                    style={{ background: 'rgba(255,255,255,.06)', color: '#F5F0E8', border: '1px solid rgba(255,255,255,.08)', padding: '12px 20px', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 2 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'pedidos' && <PedidosPanel orders={orders} loadData={loadData} showToast={showToast} setOrders={setOrders} />}
        {/* ✅ ELIMINADO: {section === 'ventas' && <VentasPanel />} */}
        {section === 'cupones' && <CuponesPanel />}
        {section === 'clientes' && <ClientesPanel />}
        {section === 'bot' && <BotPanel showToast={showToast} />}
        {section === 'contenido' && <ContenidoPanel />}
        {/* ✅ CAMBIO 2: Agregado EmailsPanel */}
        {section === 'emails' && <EmailsPanel showToast={showToast} />}

        {/* PRODUCTOS Y FOTOS */}
        {section === 'productos' && (
          <div>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '1.5rem' }}>Productos y Fotos</h1>
            {categories.map(cat => (
              <div key={cat.id} style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.75rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {cat.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)', marginBottom: '0.75rem' }}>
                  {products.filter(p => p.category_id === cat.id).map(product => (
                    <div key={product.id} style={{ background: '#111', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: product.active ? 1 : 0.5 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }} />
                          : <div style={{ width: 48, height: 48, borderRadius: 4, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🍣</div>
                        }
                        <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', borderRadius: 4, opacity: 0, transition: 'opacity .2s', fontSize: '0.7rem', color: '#fff' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          {uploading === product.id ? '...' : 'foto'}
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => e.target.files?.[0] && uploadImage(product.id, e.target.files[0])} />
                        </label>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#C8956A' }}>${product.price?.toLocaleString('es-CL')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setEditingProduct({ ...product })}
                          style={{ background: 'rgba(200,149,106,.12)', border: '1px solid rgba(200,149,106,.3)', color: '#C8956A', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>
                          Editar
                        </button>
                        <button onClick={() => toggleProduct(product.id, !product.active)}
                          style={{ background: product.active ? 'rgba(0,180,80,.12)' : 'rgba(255,255,255,.06)', border: 'none', color: product.active ? '#00b450' : 'rgba(245,240,232,.4)', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>
                          {product.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {newProduct?.category_id === cat.id ? (
                  <div style={{ background: '#0f1a0f', border: '1px solid rgba(0,180,80,.2)', borderRadius: 4, padding: '1.25rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#00b450', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Nuevo producto en {cat.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      {[
                        { k: 'name', l: 'Nombre *', p: 'Nombre del producto' },
                        { k: 'price', l: 'Precio *', p: '9990' },
                        { k: 'portions', l: 'Porciones', p: '10 CORTES' },
                        { k: 'badge', l: 'Badge', p: 'PROMO, Nikkei...' },
                      ].map(({ k, l, p }) => (
                        <div key={k}>
                          <label style={labelStyle}>{l}</label>
                          <input value={newProduct[k] || ''} onChange={e => setNewProduct((np: any) => ({ ...np, [k]: e.target.value }))}
                            placeholder={p} style={inputStyle} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={labelStyle}>Descripcion</label>
                      <input value={newProduct.description || ''} onChange={e => setNewProduct((np: any) => ({ ...np, description: e.target.value }))}
                        placeholder="Ingredientes y descripcion del producto" style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => addProduct(cat.id)} disabled={saving}
                        style={{ background: '#00b450', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
                        {saving ? 'Guardando...' : 'Agregar'}
                      </button>
                      <button onClick={() => setNewProduct(null)}
                        style={{ background: 'rgba(255,255,255,.06)', color: '#F5F0E8', border: '1px solid rgba(255,255,255,.08)', padding: '9px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setNewProduct({ category_id: cat.id, name: '', price: '', description: '', portions: '', badge: '' })}
                    style={{ background: 'rgba(0,180,80,.08)', border: '1px dashed rgba(0,180,80,.3)', color: '#00b450', padding: '8px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', width: '100%' }}>
                    Agregar producto a {cat.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PROMOCIONES */}
        {section === 'promociones' && (
          <div>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '1.5rem' }}>Promociones del mes</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
              {products.filter(p => p.category_id === categories.find((c: any) => c.slug === 'promociones')?.id).map(promo => (
                <div key={promo.id} style={{ background: '#111', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', opacity: promo.active ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{promo.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#C8956A', marginTop: 2 }}>${promo.price?.toLocaleString('es-CL')}</div>
                    {promo.description && <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.35)', marginTop: 2, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{promo.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setEditingProduct({ ...promo })}
                      style={{ background: 'rgba(200,149,106,.12)', border: '1px solid rgba(200,149,106,.3)', color: '#C8956A', padding: '6px 14px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>
                      Editar
                    </button>
                    <button onClick={() => toggleProduct(promo.id, !promo.active)}
                      style={{ background: promo.active ? '#C8956A' : 'rgba(255,255,255,.06)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>
                      {promo.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {newProduct?.category_id === categories.find((c: any) => c.slug === 'promociones')?.id ? (
              <div style={{ background: '#0f1a0f', border: '1px solid rgba(0,180,80,.2)', borderRadius: 4, padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#00b450', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Nueva Promocion</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {[{ k: 'name', l: 'Nombre *', p: 'Promo 30 Reina' }, { k: 'price', l: 'Precio *', p: '14990' }].map(({ k, l, p }) => (
                    <div key={k}>
                      <label style={labelStyle}>{l}</label>
                      <input value={newProduct[k] || ''} onChange={e => setNewProduct((np: any) => ({ ...np, [k]: e.target.value }))} placeholder={p} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>Descripcion</label>
                  <input value={newProduct.description || ''} onChange={e => setNewProduct((np: any) => ({ ...np, description: e.target.value }))}
                    placeholder="Detalle de que incluye la promocion" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => addProduct(categories.find((c: any) => c.slug === 'promociones')?.id)}
                    style={{ background: '#00b450', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
                    Agregar
                  </button>
                  <button onClick={() => setNewProduct(null)}
                    style={{ background: 'rgba(255,255,255,.06)', color: '#F5F0E8', border: '1px solid rgba(255,255,255,.08)', padding: '9px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewProduct({ category_id: categories.find((c: any) => c.slug === 'promociones')?.id, name: '', price: '', description: '', badge: 'PROMO' })}
                style={{ background: 'rgba(0,180,80,.08)', border: '1px dashed rgba(0,180,80,.3)', color: '#00b450', padding: '10px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', width: '100%', marginTop: '1rem' }}>
                Agregar nueva promocion
              </button>
            )}
          </div>
        )}

        {/* DESCUENTOS CELEBRACION */}
        {section === 'descuentos' && (
          <div style={{ maxWidth: 500 }}>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>Descuentos por Celebracion</h1>
            <p style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>El agente enviara estos descuentos automaticamente en las fechas especiales de cada cliente.</p>
            {[
              { k: 'birthday',    l: 'Cumpleanos',                desc: 'Se envia la semana del cumpleanos' },
              { k: 'anniversary', l: 'Aniversario de pololeo',    desc: 'Se envia 7 dias antes' },
              { k: 'wedding',     l: 'Aniversario de matrimonio', desc: 'Se envia 7 dias antes' },
              { k: 'special',     l: 'Fechas especiales',         desc: 'Graduacion, dia del padre, etc.' },
            ].map(({ k, l, desc }) => (
              <div key={k} style={{ background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,.4)' }}>{desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <input type="number" defaultValue={(celebConfig as any)[k]}
                    onChange={e => setCelebConfig(c => ({ ...c, [k]: parseInt(e.target.value) }))}
                    min={1} max={50}
                    style={{ width: 70, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#C8956A', padding: '8px', fontFamily: 'inherit', fontSize: '1rem', borderRadius: 2, outline: 'none', textAlign: 'center' }} />
                  <span style={{ color: 'rgba(245,240,232,.5)', fontSize: '0.85rem' }}>%</span>
                </div>
              </div>
            ))}
            <button onClick={async () => {
              setSaving(true)
              const sb = createClient()
              await sb.from('celebration_discounts').update(celebConfig).eq('id', 1)
              setSaving(false)
              showToast('Descuentos guardados')
            }}
              style={{ background: '#1B2A4A', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
              {saving ? 'Guardando...' : 'Guardar descuentos'}
            </button>
          </div>
        )}

        {/* TIMBRES */}
        {section === 'timbres' && (
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>Tarjeta de Timbres</h1>
            <p style={{ color: 'rgba(245,240,232,.5)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Configura cuantos timbres necesita el cliente para ganar su premio.</p>
            <div style={{ background: 'rgba(255,255,255,.06)', border: '2px solid #C8956A', borderRadius: 4, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⭐</span>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#F5F0E8', fontWeight: 600 }}>Configuracion del Premio</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Timbres para ganar el premio</label>
                  <input type="number" value={loyaltyConfig.stamps_required}
                    onChange={e => setLoyaltyConfig(c => ({ ...c, stamps_required: parseInt(e.target.value) }))}
                    min={1} max={50} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Pedido minimo para sumar timbre ($)</label>
                  <input type="number" value={loyaltyConfig.min_order}
                    onChange={e => setLoyaltyConfig(c => ({ ...c, min_order: parseInt(e.target.value) }))}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Premio al completar la tarjeta</label>
                <input type="text" value={loyaltyConfig.reward}
                  onChange={e => setLoyaltyConfig(c => ({ ...c, reward: e.target.value }))}
                  placeholder="Ej: Roll gratis, Bebida gratis..."
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pedido minimo para timbre doble ($)</label>
                <input type="number" value={loyaltyConfig.double_min}
                  onChange={e => setLoyaltyConfig(c => ({ ...c, double_min: parseInt(e.target.value) }))}
                  style={{ ...inputStyle, width: 200 }} />
                <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', fontStyle: 'italic' }}>
                  Pedidos de ${loyaltyConfig.double_min?.toLocaleString('es-CL')} o mas suman 2 timbres.
                </div>
              </div>
            </div>
            <button onClick={saveLoyaltyConfig} disabled={saving}
              style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '12px 28px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
              {saving ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </div>
        )}

        {/* CANJEAR PREMIO */}
        {section === 'canjear' && (
          <div style={{ maxWidth: 500 }}>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>Canjear Premio</h1>
            <p style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Ingresa el codigo del cliente para validar el canje.</p>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 4, padding: '1.5rem' }}>
              <QRValidator onValidate={validateQR} />
            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#111', border: '1px solid #C8956A', color: '#F5F0E8', padding: '10px 18px', borderRadius: 2, fontSize: '0.82rem', transform: toast ? 'translateY(0)' : 'translateY(80px)', opacity: toast ? 1 : 0, transition: 'all .3s', pointerEvents: 'none' }}>
        {toast}
      </div>
    </div>
  )
}

// ─── QR Validator ─────────────────────────────────────────────────────────────
function QRValidator({ onValidate }: { onValidate: (code: string) => void }) {
  const [code, setCode] = useState('')
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 8 }}>Codigo del cliente</label>
      <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="SLR-XXXXXXXX-..."
        style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#F5F0E8', padding: '12px 14px', fontFamily: 'monospace', fontSize: '1rem', borderRadius: 2, outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' as const }} />
      <button onClick={() => { if (code) { onValidate(code); setCode('') } }}
        style={{ width: '100%', background: code ? '#1B2A4A' : '#333', color: '#fff', border: 'none', padding: 13, fontFamily: 'inherit', fontSize: '0.85rem', cursor: code ? 'pointer' : 'not-allowed', borderRadius: 2 }}>
        Validar y Canjear
      </button>
    </div>
  )
}

// ─── Pedidos Panel ────────────────────────────────────────────────────────────
function PedidosPanel({ orders, loadData, showToast, setOrders }: {
  orders: any[]
  loadData: () => void
  showToast: (msg: string) => void
  setOrders: (fn: (prev: any[]) => any[]) => void
}) {
  const [filtro, setFiltro] = useState<'hoy' | 'semana' | 'mes' | 'anio' | 'todos'>('hoy')
  const [busqueda, setBusqueda] = useState('')

  function fechaSantiago(fecha: string) {
    return new Date(new Date(fecha).toLocaleString('en-CA', { timeZone: 'America/Santiago' }))
  }
  function hoyStr() {
    const d = new Date(new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }))
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  function exportarPedidos() {
    const headers = ['Número', 'Fecha', 'Cliente', 'Teléfono', 'Tipo', 'Total', 'Método pago', 'Estado', 'Comuna']
    const rows = orders.map(o => [
      `#${o.order_number}`,
      new Date(o.created_at).toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
      o.customer_name,
      o.customer_phone,
      o.order_type === 'retiro' ? 'Retiro' : 'Delivery',
      o.total,
      o.payment_method,
      o.status,
      o.commune || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pedidos_sushilareina.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const pedidosFiltrados = orders.filter(o => {
    const fecha = fechaSantiago(o.created_at)
    const hoy = new Date(new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }))
    const diffDias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
    let pasaFiltro = true
    if (filtro === 'hoy') pasaFiltro = diffDias === 0
    else if (filtro === 'semana') pasaFiltro = diffDias <= 6
    else if (filtro === 'mes') pasaFiltro = diffDias <= 29
    else if (filtro === 'anio') pasaFiltro = fecha.getFullYear() === hoy.getFullYear()
    if (!pasaFiltro) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').toLowerCase().includes(q) || String(o.order_number).includes(q)
    }
    return true
  })

  const grupos: Record<string, any[]> = {}
  pedidosFiltrados.forEach(o => {
    const fecha = fechaSantiago(o.created_at)
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(o)
  })
  const diasOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a))
  const totalPeriodo = pedidosFiltrados.reduce((a, o) => a + (o.total || 0), 0)
  const cantidadPeriodo = pedidosFiltrados.length

  function exportarCSV() {
    const hoy = hoyStr()
    const label = filtro === 'hoy' ? 'Hoy' : filtro === 'semana' ? 'Esta semana' : filtro === 'mes' ? 'Este mes' : filtro === 'anio' ? 'Este anio' : 'Todos'
    const filas: string[] = []
    filas.push('REPORTE DE PEDIDOS - Sushi La Reina')
    filas.push(`Periodo: ${label}`)
    filas.push(`Generado: ${hoy}`)
    filas.push(`Total pedidos: ${cantidadPeriodo}`)
    filas.push(`Ingresos totales: $${totalPeriodo.toLocaleString('es-CL')}`)
    filas.push('')
    filas.push(['Numero','Fecha','Hora','Cliente','Telefono','Tipo','Comuna','Direccion','Items','Subtotal','Costo Despacho','Total','Metodo Pago','Estado','Notas'].join(','))
    for (const dia of diasOrdenados) {
      for (const o of grupos[dia]) {
        const fecha = fechaSantiago(o.created_at)
        const items = (o.order_items || []).map((i: any) => `${i.product_name} x${i.quantity}`).join(' | ')
        const costoDespacho = o.delivery_cost || 0
        filas.push([`#${o.order_number}`,fecha.toLocaleDateString('es-CL'),fecha.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}),`"${o.customer_name||''}"`,o.customer_phone||'',o.order_type==='retiro'?'Retiro':'Delivery',o.commune||'',`"${o.delivery_address||''}"`,`"${items}"`,((o.total||0)-costoDespacho),costoDespacho,o.total||0,o.payment_method||'',o.status||'',`"${o.notes||''}"`].join(','))
      }
      const totalDia = grupos[dia].reduce((a: number, o: any) => a + (o.total || 0), 0)
      filas.push(`,,,,,,,,,,,"Subtotal ${dia}",,,${totalDia},,`)
      filas.push('')
    }
    filas.push(`,,,,,,,,,,,"TOTAL ${label}",,,${totalPeriodo},,`)
    const blob = new Blob(['\uFEFF' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `pedidos_${filtro}_${hoy}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const STATUS_BG: Record<string, string> = { nuevo: 'rgba(200,0,28,.2)', preparando: 'rgba(212,160,23,.2)', listo: 'rgba(0,180,80,.2)', entregado: 'rgba(0,180,80,.1)', cancelado: 'rgba(155,34,38,.15)' }

  function labelDia(key: string) {
    const hoy = hoyStr()
    const d = new Date(new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }))
    d.setDate(d.getDate() - 1)
    const ayer = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (key === hoy) return 'Hoy'
    if (key === ayer) return 'Ayer'
    const [y, m, dd] = key.split('-').map(Number)
    return new Date(y, m-1, dd).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300 }}>Pedidos</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportarCSV} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}>Exportar CSV</button>
          <button onClick={loadData} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#F5F0E8', padding: '7px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}>Actualizar</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: 3, marginBottom: '1rem', width: 'fit-content' }}>
        {([{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Esta semana' }, { id: 'mes', label: 'Este mes' }, { id: 'anio', label: 'Este año' }, { id: 'todos', label: 'Todos' }] as const).map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            style={{ padding: '6px 14px', border: 'none', borderRadius: 3, fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer', background: filtro === f.id ? '#1B2A4A' : 'transparent', color: filtro === f.id ? '#F5EDE8' : 'rgba(245,240,232,.5)', fontWeight: filtro === f.id ? 700 : 400 }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, telefono o numero..."
          style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.82rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' }} />
        <button onClick={exportarPedidos} style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '7px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}>
          ⬇️ Exportar Excel
        </button>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        {[{ label: 'Pedidos', valor: cantidadPeriodo, icon: '📋' }, { label: 'Ingresos', valor: `$${totalPeriodo.toLocaleString('es-CL')}`, icon: '💰' }, { label: 'Promedio', valor: cantidadPeriodo > 0 ? `$${Math.round(totalPeriodo/cantidadPeriodo).toLocaleString('es-CL')}` : '$0', icon: '📊' }].map(({ label, valor, icon }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, padding: '0.75rem 1rem', flex: 1 }}>
            <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{icon}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', fontWeight: 700, color: '#C8956A' }}>{valor}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
          </div>
        ))}
      </div>
      {pedidosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(245,240,232,.3)', padding: '4rem 0', fontSize: '0.85rem' }}>No hay pedidos en este periodo</div>
      ) : diasOrdenados.map(dia => {
        const totalDia = grupos[dia].reduce((a, o) => a + (o.total || 0), 0)
        return (
          <div key={dia} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '0.5rem', borderBottom: '1px solid rgba(200,149,106,.25)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#C8956A', textTransform: 'capitalize' }}>{labelDia(dia)}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,.4)' }}>
                {grupos[dia].length} pedido{grupos[dia].length !== 1 ? 's' : ''} · <span style={{ color: '#C8956A', fontWeight: 600 }}>${totalDia.toLocaleString('es-CL')}</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
              {grupos[dia].map(order => (
                <div key={order.id} style={{ background: '#111', padding: '0.9rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontFamily: 'Georgia,serif', fontSize: '0.95rem', color: '#C8956A', minWidth: 52 }}>#{order.order_number}</span>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{order.customer_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(245,240,232,.4)' }}>
                          {order.customer_phone} · {order.order_type === 'retiro' ? 'Retiro' : `Delivery ${order.commune || ''}`} · {new Date(new Date(order.created_at).toLocaleString('en-CA', { timeZone: 'America/Santiago' })).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ color: '#C8956A', fontWeight: 700, fontSize: '0.95rem' }}>${order.total?.toLocaleString('es-CL')}</span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 2, background: 'rgba(255,255,255,.06)', color: 'rgba(245,240,232,.45)', textTransform: 'uppercase' }}>{order.payment_method}</span>
                      <select value={order.status}
                        onChange={async e => {
                          const sb = createClient()
                          await sb.from('orders').update({ status: e.target.value }).eq('id', order.id)
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: e.target.value } : o))
                          showToast('Estado actualizado')
                        }}
                        style={{ background: STATUS_BG[order.status] || STATUS_BG['nuevo'], border: '1px solid rgba(255,255,255,.1)', color: '#F5F0E8', padding: '4px 8px', borderRadius: 2, fontFamily: 'inherit', fontSize: '0.72rem', cursor: 'pointer', outline: 'none' }}>
                        <option value="nuevo">Nuevo</option>
                        <option value="preparando">Preparando</option>
                        <option value="listo">Listo</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(order.order_items || []).map((item: any) => (
                      <span key={item.id} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,.05)', padding: '2px 8px', borderRadius: 2, color: 'rgba(245,240,232,.55)' }}>{item.product_name} x{item.quantity}</span>
                    ))}
                    {order.notes && <span style={{ fontSize: '0.7rem', color: '#C8956A', fontStyle: 'italic' }}>Nota: {order.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Ventas Panel (ELIMINADO) ─────────────────────────────────────────────────

// ─── Cupones Panel ────────────────────────────────────────────────────────────
function CuponesPanel() {
  const [cupones, setCupones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: '', expires_at: '', active: true })
  const inp = { width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,.6)', marginBottom: 4 }
  useEffect(() => { loadCupones() }, [])
  async function loadCupones() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('coupons').select('*').order('created_at', { ascending: false })
    setCupones(data || []); setLoading(false)
  }
  async function saveCupon() {
    if (!form.code || !form.discount_value) return
    setSaving(true)
    const sb = createClient()
    const payload: any = { code: form.code.toUpperCase().trim(), description: form.description, discount_type: form.discount_type, discount_value: Number(form.discount_value), min_order: Number(form.min_order) || 0, max_uses: form.max_uses ? Number(form.max_uses) : null, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null, active: form.active }
    const { error } = await sb.from('coupons').insert(payload)
    if (!error) { setForm({ code: '', description: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: '', expires_at: '', active: true }); setShowForm(false); loadCupones() }
    setSaving(false)
  }
  async function toggleCupon(id: string, active: boolean) { const sb = createClient(); await sb.from('coupons').update({ active }).eq('id', id); setCupones(prev => prev.map(c => c.id === id ? { ...c, active } : c)) }
  async function deleteCupon(id: string) { if (!confirm('Eliminar este cupon?')) return; const sb = createClient(); await sb.from('coupons').delete().eq('id', id); setCupones(prev => prev.filter(c => c.id !== id)) }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300 }}>Cupones de descuento</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>{showForm ? 'Cancelar' : '+ Nuevo cupon'}</button>
      </div>
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={lbl}>Codigo *</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="VERANO20" style={inp} /></div>
            <div><label style={lbl}>Descripcion</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="20% en pedidos sobre $15.000" style={inp} /></div>
            <div><label style={lbl}>Tipo</label><select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo ($)</option></select></div>
            <div><label style={lbl}>Valor *</label><input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} style={inp} /></div>
            <div><label style={lbl}>Pedido minimo ($)</label><input type="number" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: Number(e.target.value) }))} placeholder="0" style={inp} /></div>
            <div><label style={lbl}>Maximo de usos</label><input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Ilimitado" style={inp} /></div>
            <div><label style={lbl}>Fecha expiracion</label><input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inp} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#F5F0E8' }}><input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />Activo desde el inicio</label></div>
          </div>
          <button onClick={saveCupon} disabled={saving} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }}>{saving ? 'Guardando...' : 'Crear cupon'}</button>
        </div>
      )}
      {loading ? <div style={{ textAlign: 'center', color: 'rgba(245,240,232,.4)', padding: '3rem 0' }}>Cargando cupones...</div>
      : cupones.length === 0 ? <div style={{ textAlign: 'center', color: 'rgba(245,240,232,.4)', padding: '3rem 0', fontSize: '0.85rem' }}>No hay cupones creados aun.</div>
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
          {cupones.map(cupon => {
            const expirado = cupon.expires_at && new Date(cupon.expires_at) < new Date()
            const agotado = cupon.max_uses && cupon.uses_count >= cupon.max_uses
            return (
              <div key={cupon.id} style={{ background: '#111', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: (!cupon.active || expirado || agotado) ? 0.6 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#F5F0E8', letterSpacing: '.08em' }}>{cupon.code}</span>
                    {expirado && <span style={{ fontSize: '0.6rem', background: 'rgba(155,34,38,.1)', color: '#ff6b6b', padding: '2px 6px', borderRadius: 2, fontWeight: 700 }}>EXPIRADO</span>}
                    {agotado && <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,.08)', color: 'rgba(245,240,232,.4)', padding: '2px 6px', borderRadius: 2, fontWeight: 700 }}>AGOTADO</span>}
                    {cupon.active && !expirado && !agotado && <span style={{ fontSize: '0.6rem', background: 'rgba(0,180,80,.1)', color: '#00b450', padding: '2px 6px', borderRadius: 2, fontWeight: 700 }}>ACTIVO</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(245,240,232,.5)', marginBottom: 4 }}>{cupon.description}</div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'rgba(245,240,232,.4)' }}>
                    <span style={{ color: '#C8956A', fontWeight: 600 }}>{cupon.discount_type === 'percent' ? `${cupon.discount_value}% off` : `$${cupon.discount_value.toLocaleString('es-CL')} off`}</span>
                    {cupon.min_order > 0 && <span>Min ${cupon.min_order.toLocaleString('es-CL')}</span>}
                    <span>Usos: {cupon.uses_count}{cupon.max_uses ? ` / ${cupon.max_uses}` : ''}</span>
                    {cupon.expires_at && <span>Vence: {new Date(cupon.expires_at).toLocaleDateString('es-CL')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleCupon(cupon.id, !cupon.active)} style={{ background: cupon.active ? 'rgba(0,180,80,.1)' : 'rgba(255,255,255,.06)', border: 'none', color: cupon.active ? '#00b450' : 'rgba(245,240,232,.4)', padding: '6px 14px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>{cupon.active ? 'Activo' : 'Inactivo'}</button>
                  <button onClick={() => deleteCupon(cupon.id)} style={{ background: 'rgba(155,34,38,.08)', border: 'none', color: '#ff6b6b', padding: '6px 14px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Contenido Panel (MODIFICADO) ────────────────────────────────────────────
function ContenidoPanel() {
  const [tab, setTab] = useState<'faq' | 'blog' | 'nosotros' | 'comunidad'>('faq')
  const [posts, setPosts] = useState<any[]>([])
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingFaq, setEditingFaq] = useState<any>(null)
  const [newPost, setNewPost] = useState({ title: '', slug: '', excerpt: '', content: '', published: false, featured: false, meta_title: '', meta_description: '' })
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'general', sort_order: 0, active: true })
  const inp = { width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,.6)', marginBottom: 4 }
  useEffect(() => { loadData() }, [tab])
  async function loadData() {
    setLoading(true)
    const sb = createClient()
    if (tab === 'blog') { const { data } = await sb.from('cms_posts').select('*').order('created_at', { ascending: false }); setPosts(data || []) }
    else if (tab === 'faq') { const { data } = await sb.from('cms_faqs').select('*').order('sort_order'); setFaqs(data || []) }
    setLoading(false)
  }
  async function savePost() {
    if (!newPost.title || !newPost.slug) return; setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('cms_posts').insert({ ...newPost, slug: newPost.slug.toLowerCase().replace(/\s+/g, '-') })
    if (!error) { setShowForm(false); setNewPost({ title: '', slug: '', excerpt: '', content: '', published: false, featured: false, meta_title: '', meta_description: '' }); loadData() }
    setSaving(false)
  }
  async function togglePost(id: string, published: boolean) { const sb = createClient(); await sb.from('cms_posts').update({ published }).eq('id', id); setPosts(prev => prev.map(p => p.id === id ? { ...p, published } : p)) }
  async function deletePost(id: string) { if (!confirm('Eliminar este post?')) return; const sb = createClient(); await sb.from('cms_posts').delete().eq('id', id); setPosts(prev => prev.filter(p => p.id !== id)) }
  async function saveFaq() {
    if (!newFaq.question || !newFaq.answer) return; setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('cms_faqs').insert(newFaq)
    if (!error) { setShowForm(false); setNewFaq({ question: '', answer: '', category: 'general', sort_order: 0, active: true }); loadData() }
    setSaving(false)
  }
  async function updateFaq(faq: any) {
    setSaving(true); const sb = createClient()
    await sb.from('cms_faqs').update({ question: faq.question, answer: faq.answer, category: faq.category, active: faq.active }).eq('id', faq.id)
    setEditingFaq(null); loadData(); setSaving(false)
  }
  async function deleteFaq(id: string) { if (!confirm('Eliminar esta pregunta?')) return; const sb = createClient(); await sb.from('cms_faqs').delete().eq('id', id); setFaqs(prev => prev.filter(f => f.id !== id)) }
  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '1.5rem' }}>Contenido</h1>
      <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: 3, marginBottom: '1.5rem', width: 'fit-content', flexWrap: 'wrap' }}>
        {([{ id: 'faq', label: '❓ FAQ' }, { id: 'blog', label: '📰 Blog' }, { id: 'nosotros', label: '👥 Quiénes Somos' }, { id: 'comunidad', label: '📸 Comunidad' }] as const).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false) }}
            style={{ padding: '7px 20px', border: 'none', borderRadius: 3, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', background: tab === t.id ? '#1B2A4A' : 'transparent', color: tab === t.id ? '#F5EDE8' : 'rgba(245,240,232,.5)', fontWeight: tab === t.id ? 700 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'faq' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.82rem' }}>{faqs.length} preguntas</span>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>{showForm ? 'Cancelar' : '+ Nueva pregunta'}</button>
          </div>
          {showForm && (
            <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Pregunta *</label><input value={newFaq.question} onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))} placeholder="Cual es el horario?" style={inp} /></div>
                <div><label style={lbl}>Categoria</label><select value={newFaq.category} onChange={e => setNewFaq(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}><option value="general">General</option><option value="delivery">Delivery</option><option value="pagos">Pagos</option><option value="carta">Carta</option><option value="fidelidad">Fidelidad</option></select></div>
                <div><label style={lbl}>Orden</label><input type="number" value={newFaq.sort_order} onChange={e => setNewFaq(f => ({ ...f, sort_order: parseInt(e.target.value) }))} style={inp} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Respuesta *</label><textarea value={newFaq.answer} onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))} placeholder="Respuesta detallada..." rows={3} style={{ ...inp, resize: 'vertical' as const }} /></div>
              </div>
              <button onClick={saveFaq} disabled={saving} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>{saving ? 'Guardando...' : 'Guardar pregunta'}</button>
            </div>
          )}
          {loading ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0' }}>Cargando...</div> : faqs.length === 0 ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0', fontSize: '0.85rem' }}>No hay preguntas aun.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
              {faqs.map(faq => (
                <div key={faq.id} style={{ background: '#111', padding: '1rem 1.25rem' }}>
                  {editingFaq?.id === faq.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input value={editingFaq.question} onChange={e => setEditingFaq((f: any) => ({ ...f, question: e.target.value }))} style={inp} />
                      <textarea value={editingFaq.answer} onChange={e => setEditingFaq((f: any) => ({ ...f, answer: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' as const }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => updateFaq(editingFaq)} disabled={saving} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
                        <button onClick={() => setEditingFaq(null)} style={{ background: 'rgba(255,255,255,.06)', color: '#F5F0E8', border: '1px solid rgba(255,255,255,.08)', padding: '7px 16px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: 4 }}>{faq.question}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,.4)', marginBottom: 4 }}>{faq.answer}</div>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,.08)', color: 'rgba(245,240,232,.4)', padding: '2px 8px', borderRadius: 2 }}>{faq.category}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setEditingFaq({ ...faq })} style={{ background: 'rgba(200,149,106,.12)', border: '1px solid rgba(200,149,106,.3)', color: '#C8956A', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>Editar</button>
                        <button onClick={() => deleteFaq(faq.id)} style={{ background: 'rgba(155,34,38,.08)', border: 'none', color: '#ff6b6b', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>Eliminar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'blog' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.82rem' }}>{posts.length} articulos</span>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>{showForm ? 'Cancelar' : '+ Nuevo articulo'}</button>
          </div>
          {showForm && (
            <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div><label style={lbl}>Titulo *</label><input value={newPost.title} onChange={e => { const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-'); setNewPost(p => ({ ...p, title: e.target.value, slug })) }} placeholder="Mi articulo" style={inp} /></div>
                <div><label style={lbl}>Slug (URL) *</label><input value={newPost.slug} onChange={e => setNewPost(p => ({ ...p, slug: e.target.value }))} placeholder="mi-articulo" style={inp} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Extracto</label><input value={newPost.excerpt} onChange={e => setNewPost(p => ({ ...p, excerpt: e.target.value }))} placeholder="Breve descripcion" style={inp} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Contenido (HTML)</label><textarea value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} placeholder="<p>Contenido...</p>" rows={6} style={{ ...inp, resize: 'vertical' as const }} /></div>
                <div><label style={lbl}>Meta titulo SEO</label><input value={newPost.meta_title} onChange={e => setNewPost(p => ({ ...p, meta_title: e.target.value }))} placeholder="Titulo para Google" style={inp} /></div>
                <div><label style={lbl}>Meta descripcion SEO</label><input value={newPost.meta_description} onChange={e => setNewPost(p => ({ ...p, meta_description: e.target.value }))} placeholder="Descripcion para Google" style={inp} /></div>
                <div style={{ display: 'flex', gap: '1rem', paddingTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#F5F0E8' }}><input type="checkbox" checked={newPost.published} onChange={e => setNewPost(p => ({ ...p, published: e.target.checked }))} />Publicar ahora</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#F5F0E8' }}><input type="checkbox" checked={newPost.featured} onChange={e => setNewPost(p => ({ ...p, featured: e.target.checked }))} />Destacado</label>
                </div>
              </div>
              <button onClick={savePost} disabled={saving} style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>{saving ? 'Guardando...' : 'Guardar articulo'}</button>
            </div>
          )}
          {loading ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0' }}>Cargando...</div> : posts.length === 0 ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0', fontSize: '0.85rem' }}>No hay articulos aun.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: '#111', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: 4 }}>{post.title}</div>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'rgba(245,240,232,.35)' }}><span>/blog/{post.slug}</span>{post.featured && <span style={{ color: '#C8956A' }}>Destacado</span>}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => togglePost(post.id, !post.published)} style={{ background: post.published ? 'rgba(0,180,80,.1)' : 'rgba(255,255,255,.06)', border: 'none', color: post.published ? '#00b450' : 'rgba(245,240,232,.4)', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>{post.published ? 'Publicado' : 'Borrador'}</button>
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(245,240,232,.5)', padding: '5px 12px', borderRadius: 2, fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Ver</a>
                    <button onClick={() => deletePost(post.id)} style={{ background: 'rgba(155,34,38,.08)', border: 'none', color: '#ff6b6b', padding: '5px 12px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'nosotros' && <NosotrosPanel />}
      {tab === 'comunidad' && <ComunidadPanel />}
    </div>
  )
}

// ─── Clientes Panel ───────────────────────────────────────────────────────────
function ClientesPanel() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState<any | null>(null)
  const [pedidosCliente, setPedidosCliente] = useState<any[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  useEffect(() => { loadClientes() }, [])
  async function loadClientes() {
    setLoading(true)
    const sb = createClient()
    const { data: perfiles } = await sb.from('user_profiles').select('*').order('created_at', { ascending: false })
    if (!perfiles) { setLoading(false); return }
    const { data: ordenes } = await sb.from('orders').select('user_id, total, created_at').not('user_id', 'is', null)
    const resumen: Record<string, { total_pedidos: number; total_gastado: number; ultimo_pedido: string }> = {}
    for (const o of ordenes || []) {
      if (!resumen[o.user_id]) resumen[o.user_id] = { total_pedidos: 0, total_gastado: 0, ultimo_pedido: '' }
      resumen[o.user_id].total_pedidos++
      resumen[o.user_id].total_gastado += Number(o.total || 0)
      if (!resumen[o.user_id].ultimo_pedido || o.created_at > resumen[o.user_id].ultimo_pedido) resumen[o.user_id].ultimo_pedido = o.created_at
    }
    setClientes(perfiles.map(p => ({ ...p, total_pedidos: resumen[p.user_id]?.total_pedidos || 0, total_gastado: resumen[p.user_id]?.total_gastado || 0, ultimo_pedido: resumen[p.user_id]?.ultimo_pedido || null })))
    setLoading(false)
  }
  async function verDetalle(cliente: any) {
    setDetalle(cliente); setLoadingPedidos(true)
    const sb = createClient()
    const { data } = await sb.from('orders').select('*, order_items(*)').eq('user_id', cliente.user_id).order('created_at', { ascending: false }).limit(20)
    setPedidosCliente(data || []); setLoadingPedidos(false)
  }
  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)
  })
  return (
    <div>
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div><div style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem' }}>{detalle.alias || detalle.full_name || 'Sin nombre'}</div><div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', marginTop: 2 }}>{detalle.email}</div></div>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', color: '#F5F0E8', fontSize: '1.3rem', cursor: 'pointer', opacity: .5 }}>X</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {[{ label: 'Pedidos', valor: detalle.total_pedidos }, { label: 'Total gastado', valor: `$${detalle.total_gastado.toLocaleString('es-CL')}` }, { label: 'Telefono', valor: detalle.phone || '—' }].map(({ label, valor }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.4)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 600, color: '#C8956A' }}>{valor}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: '0.75rem' }}>Historial de pedidos</div>
              {loadingPedidos ? <div style={{ color: 'rgba(245,240,232,.3)', fontSize: '0.85rem' }}>Cargando...</div>
              : pedidosCliente.length === 0 ? <div style={{ color: 'rgba(245,240,232,.3)', fontSize: '0.85rem' }}>Sin pedidos registrados.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {pedidosCliente.map(order => (
                    <div key={order.id} style={{ background: 'rgba(255,255,255,.04)', padding: '0.75rem 1rem', borderRadius: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#C8956A', fontFamily: 'Georgia,serif', fontSize: '0.88rem' }}>#{order.order_number}</span>
                        <span style={{ color: '#C8956A', fontWeight: 600, fontSize: '0.85rem' }}>${order.total?.toLocaleString('es-CL')}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        {(order.order_items || []).map((item: any) => <span key={item.id} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,.06)', padding: '2px 8px', borderRadius: 2, color: 'rgba(245,240,232,.5)' }}>{item.product_name} x{item.quantity}</span>)}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.25)' }}>{new Date(order.created_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300 }}>Clientes</h1>
        <span style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.82rem' }}>{clientes.length} registrados</span>
      </div>
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, email o telefono..."
        style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '10px 14px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }} />
      {loading ? <div style={{ textAlign: 'center', color: 'rgba(245,240,232,.4)', padding: '3rem 0' }}>Cargando clientes...</div>
      : filtrados.length === 0 ? <div style={{ textAlign: 'center', color: 'rgba(245,240,232,.4)', padding: '3rem 0', fontSize: '0.85rem' }}>{busqueda ? 'No se encontraron clientes.' : 'No hay clientes registrados aun.'}</div>
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
          {filtrados.map(cliente => (
            <div key={cliente.user_id} style={{ background: '#111', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: 2 }}>{cliente.alias ? `${cliente.alias} (${cliente.full_name || ''})` : cliente.full_name || 'Sin nombre'}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', display: 'flex', gap: '1rem' }}><span>{cliente.email}</span>{cliente.phone && <span>{cliente.phone}</span>}</div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#C8956A' }}>${cliente.total_gastado.toLocaleString('es-CL')}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.3)' }}>{cliente.total_pedidos} pedidos</div>
                </div>
                {cliente.ultimo_pedido && <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.3)', textAlign: 'right' }}>Ultimo:<br />{new Date(cliente.ultimo_pedido).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}</div>}
                <button onClick={() => verDetalle(cliente)} style={{ background: 'rgba(200,149,106,.12)', border: '1px solid rgba(200,149,106,.3)', color: '#C8956A', padding: '5px 14px', borderRadius: 2, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', flexShrink: 0 }}>Ver detalle</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Bot Panel ────────────────────────────────────────────────────────────────
function BotPanel({ showToast }: { showToast: (msg: string) => void }) {
  const [tab, setTab] = useState<'conversaciones' | 'config'>('conversaciones')
  const [conversations, setConversations] = useState<any[]>([])
  const [config, setConfig] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])

  const inp = { width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,.6)', marginBottom: 4 }

  useEffect(() => { loadData() }, [tab])

  async function loadData() {
    setLoading(true)
    const sb = createClient()
    if (tab === 'conversaciones') {
      const { data } = await sb.from('bot_conversations').select('*').order('last_message_at', { ascending: false }).limit(50)
      setConversations(data || [])
    } else if (tab === 'config') {
      const { data } = await sb.from('bot_config').select('*')
      const cfg: any = {}
      data?.forEach((c: any) => { cfg[c.key] = c.value })
      setConfig(cfg)
    }
    setLoading(false)
  }

  async function loadMessages(conv: any) {
    setSelectedConv(conv)
    const sb = createClient()
    const { data } = await sb.from('bot_messages').select('*').eq('conversation_id', conv.id).order('created_at')
    setMessages(data || [])
  }

  async function saveConfig() {
    setSaving(true)
    const sb = createClient()
    for (const [key, value] of Object.entries(config)) {
      await sb.from('bot_config').upsert({ key, value }).eq('key', key)
    }
    setSaving(false)
    showToast('Configuracion guardada')
  }

  async function resetConversation(convId: string) {
    const sb = createClient()
    await sb.from('bot_conversations').update({ state: 'inicio', cart: [], context: {} }).eq('id', convId)
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, state: 'inicio' } : c))
    showToast('Conversacion reiniciada')
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '1.5rem' }}>Bot WhatsApp</h1>

      <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4 }}>Estado del Bot</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,.4)' }}>Webhook: <code style={{ color: '#C8956A' }}>/api/bot/webhook</code></div>
        </div>
        <div style={{ background: 'rgba(0,180,80,.15)', color: '#00b450', padding: '4px 12px', borderRadius: 2, fontSize: '0.75rem', fontWeight: 700 }}>
          Configurado
        </div>
      </div>

      <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: 3, marginBottom: '1.5rem', width: 'fit-content' }}>
        {([{ id: 'conversaciones', label: 'Conversaciones' }, { id: 'config', label: 'Configuracion' }] as const).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedConv(null) }}
            style={{ padding: '7px 16px', border: 'none', borderRadius: 3, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', background: tab === t.id ? '#1B2A4A' : 'transparent', color: tab === t.id ? '#F5EDE8' : 'rgba(245,240,232,.5)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'conversaciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedConv ? '1fr 1fr' : '1fr', gap: '1rem' }}>
          <div>
            {loading ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0' }}>Cargando...</div>
            : conversations.length === 0 ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0', fontSize: '0.85rem' }}>No hay conversaciones aun.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,.04)' }}>
                {conversations.map(conv => (
                  <div key={conv.id} onClick={() => loadMessages(conv)}
                    style={{ background: selectedConv?.id === conv.id ? 'rgba(200,149,106,.12)' : '#111', padding: '0.9rem 1.25rem', cursor: 'pointer', borderLeft: selectedConv?.id === conv.id ? '3px solid #C8956A' : '3px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{conv.customer_name || conv.phone}</span>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 2, color: 'rgba(245,240,232,.5)' }}>{conv.state}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(245,240,232,.35)' }}>
                      <span>{conv.phone}</span>
                      <span>{new Date(conv.last_message_at).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</span>
                    </div>
                    {conv.cart?.length > 0 && <div style={{ marginTop: 4, fontSize: '0.7rem', color: '#C8956A' }}>Carrito: {conv.cart.length} producto(s)</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedConv && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, display: 'flex', flexDirection: 'column', maxHeight: 500 }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedConv.customer_name || selectedConv.phone}</span>
                <button onClick={() => resetConversation(selectedConv.id)}
                  style={{ background: 'rgba(155,34,38,.12)', border: 'none', color: '#ff6b6b', padding: '4px 10px', borderRadius: 2, cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                  Reiniciar
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'in' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ maxWidth: '80%', background: msg.direction === 'in' ? 'rgba(255,255,255,.08)' : 'rgba(200,149,106,.2)', padding: '6px 10px', borderRadius: 4, fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'config' && (
        <div style={{ maxWidth: 600 }}>
          {loading ? <div style={{ color: 'rgba(245,240,232,.3)' }}>Cargando...</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '1rem' }}>Tiempos de cocina</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={lbl}>Tiempo base (min)</label><input type="number" value={config.tiempos_cocina?.base_minutos || 20} onChange={e => setConfig((c: any) => ({ ...c, tiempos_cocina: { ...c.tiempos_cocina, base_minutos: parseInt(e.target.value) } }))} style={inp} /></div>
                  <div><label style={lbl}>Extra por producto (min)</label><input type="number" value={config.tiempos_cocina?.por_producto || 5} onChange={e => setConfig((c: any) => ({ ...c, tiempos_cocina: { ...c.tiempos_cocina, por_producto: parseInt(e.target.value) } }))} style={inp} /></div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '1rem' }}>Costo de delivery</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={lbl}>Costo base ($)</label><input type="number" value={config.costo_envio?.base || 2000} onChange={e => setConfig((c: any) => ({ ...c, costo_envio: { ...c.costo_envio, base: parseInt(e.target.value) } }))} style={inp} /></div>
                  <div><label style={lbl}>Gratis sobre ($)</label><input type="number" value={config.costo_envio?.gratis_sobre || 25000} onChange={e => setConfig((c: any) => ({ ...c, costo_envio: { ...c.costo_envio, gratis_sobre: parseInt(e.target.value) } }))} style={inp} /></div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '1rem' }}>Mensajes del bot</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div><label style={lbl}>Mensaje de bienvenida</label><textarea value={config.mensajes?.bienvenida || ''} onChange={e => setConfig((c: any) => ({ ...c, mensajes: { ...c.mensajes, bienvenida: e.target.value } }))} rows={4} style={{ ...inp, resize: 'vertical' as const }} /></div>
                  <div><label style={lbl}>Mensaje de despedida</label><input value={config.mensajes?.despedida || ''} onChange={e => setConfig((c: any) => ({ ...c, mensajes: { ...c.mensajes, despedida: e.target.value } }))} style={inp} /></div>
                </div>
              </div>
              <button onClick={saveConfig} disabled={saving} style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '12px 28px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                {saving ? 'Guardando...' : 'Guardar configuracion'}
              </button>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', marginBottom: 8 }}>Variables de entorno necesarias en Vercel:</div>
                {['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'].map(v => (
                  <div key={v} style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#C8956A', marginBottom: 4 }}>{v}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── NosotrosPanel ────────────────────────────────────────────────────────────
function NosotrosPanel() {
  const [fotos, setFotos] = useState<any[]>([])
  const [historia, setHistoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newFoto, setNewFoto] = useState({ caption: '', file: null as File | null })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const sb = createClient()
    const [fotosRes, configRes] = await Promise.all([
      sb.from('gallery_photos').select('*').eq('type', 'team').order('created_at'),
      sb.from('business_config').select('description').eq('id', 1).single(),
    ])
    setFotos(fotosRes.data || [])
    setHistoria(configRes.data?.description || '')
    setLoading(false)
  }

  async function uploadFoto() {
    if (!newFoto.file) return
    setUploading(true)
    const sb = createClient()
    const ext = newFoto.file.name.split('.').pop()
    const path = `team/${Date.now()}.${ext}`
    const { error } = await sb.storage.from('gallery').upload(path, newFoto.file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = sb.storage.from('gallery').getPublicUrl(path)
      await sb.from('gallery_photos').insert({ photo_url: publicUrl, caption: newFoto.caption, type: 'team', approved: true })
      setNewFoto({ caption: '', file: null })
      loadData()
    }
    setUploading(false)
  }

  async function deleteFoto(id: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    const sb = createClient()
    await sb.from('gallery_photos').delete().eq('id', id)
    setFotos(prev => prev.filter(f => f.id !== id))
  }

  async function saveHistoria() {
    setSaving(true)
    const sb = createClient()
    await sb.from('business_config').update({ description: historia }).eq('id', 1)
    setSaving(false)
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,.6)', marginBottom: 4 }

  return (
    <div>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.3rem', fontWeight: 300, marginBottom: '1.5rem' }}>👥 Quiénes Somos</h2>

      {/* Historia */}
      <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '0.75rem' }}>📖 Historia del local</div>
        <textarea value={historia} onChange={e => setHistoria(e.target.value)}
          placeholder="Escribe la historia, misión y valores del negocio..."
          rows={6} style={{ ...inp, resize: 'vertical' as const, marginBottom: '0.75rem' }} />
        <button onClick={saveHistoria} disabled={saving}
          style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
          {saving ? 'Guardando...' : '💾 Guardar historia'}
        </button>
      </div>

      {/* Fotos del equipo */}
      <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '0.75rem' }}>📷 Fotos del equipo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: '1rem' }}>
          {fotos.map(foto => (
            <div key={foto.id} style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
              <img src={foto.photo_url} alt={foto.caption} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
              {foto.caption && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.6)', padding: '4px 8px', fontSize: '0.7rem', color: '#fff' }}>{foto.caption}</div>}
              <button onClick={() => deleteFoto(foto.id)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(155,34,38,.8)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={lbl}>Nombre / descripción</label>
            <input value={newFoto.caption} onChange={e => setNewFoto(f => ({ ...f, caption: e.target.value }))} placeholder="Ej: María, chef principal" style={inp} />
          </div>
          <div>
            <label style={lbl}>Foto</label>
            <input type="file" accept="image/*" onChange={e => setNewFoto(f => ({ ...f, file: e.target.files?.[0] || null }))}
              style={{ ...inp, cursor: 'pointer' }} />
          </div>
        </div>
        <button onClick={uploadFoto} disabled={uploading || !newFoto.file}
          style={{ background: '#C8956A', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
          {uploading ? 'Subiendo...' : '📷 Subir foto'}
        </button>
      </div>
    </div>
  )
}

// ─── ComunidadPanel ──────────────────────────────────────────────────────────
function ComunidadPanel() {
  const [fotos, setFotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  useEffect(() => { loadFotos() }, [filter])

  async function loadFotos() {
    setLoading(true)
    const sb = createClient()
    let query = sb.from('gallery_photos').select('*').eq('type', 'community').order('created_at', { ascending: false })
    if (filter === 'pending') query = query.eq('approved', false)
    else if (filter === 'approved') query = query.eq('approved', true)
    const { data } = await query
    setFotos(data || [])
    setLoading(false)
  }

  async function approve(id: string) {
    const sb = createClient()
    await sb.from('gallery_photos').update({ approved: true }).eq('id', id)
    setFotos(prev => prev.map(f => f.id === id ? { ...f, approved: true } : f))
  }

  async function reject(id: string) {
    if (!confirm('¿Rechazar y eliminar esta foto?')) return
    const sb = createClient()
    await sb.from('gallery_photos').delete().eq('id', id)
    setFotos(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.3rem', fontWeight: 300 }}>📸 Comunidad</h2>
        <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,.06)', borderRadius: 4, padding: 3 }}>
          {([{ id: 'pending', label: '⏳ Pendientes' }, { id: 'approved', label: '✅ Aprobadas' }, { id: 'all', label: '📋 Todas' }] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '5px 12px', border: 'none', borderRadius: 3, fontFamily: 'inherit', fontSize: '0.75rem', cursor: 'pointer', background: filter === f.id ? '#1B2A4A' : 'transparent', color: filter === f.id ? '#F5EDE8' : 'rgba(245,240,232,.5)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(200,149,106,.08)', border: '1px solid rgba(200,149,106,.2)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'rgba(245,240,232,.6)' }}>
        📱 Los clientes pueden subir fotos en: <span style={{ color: '#C8956A', fontFamily: 'monospace' }}>sushilareina.cl/comunidad</span>
      </div>

      {loading ? <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0' }}>Cargando...</div> : fotos.length === 0 ? (
        <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0', textAlign: 'center', fontSize: '0.85rem' }}>
          {filter === 'pending' ? 'No hay fotos pendientes de aprobación.' : 'No hay fotos aún.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {fotos.map(foto => (
            <div key={foto.id} style={{ background: '#111', borderRadius: 4, overflow: 'hidden', border: `1px solid ${foto.approved ? 'rgba(0,180,80,.3)' : 'rgba(255,255,255,.08)'}` }}>
              <img src={foto.photo_url} alt={foto.caption || ''} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              <div style={{ padding: '0.75rem' }}>
                {foto.caption && <div style={{ fontSize: '0.78rem', color: 'rgba(245,240,232,.7)', marginBottom: 4 }}>{foto.caption}</div>}
                {foto.uploaded_by && <div style={{ fontSize: '0.68rem', color: 'rgba(245,240,232,.35)', marginBottom: 8 }}>Por: {foto.uploaded_by}</div>}
                <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,.25)', marginBottom: 8 }}>
                  {new Date(foto.created_at).toLocaleDateString('es-CL')}
                </div>
                {!foto.approved ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => approve(foto.id)}
                      style={{ flex: 1, background: 'rgba(0,180,80,.15)', border: '1px solid rgba(0,180,80,.3)', color: '#00b450', padding: '5px', borderRadius: 2, cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                      ✅ Aprobar
                    </button>
                    <button onClick={() => reject(foto.id)}
                      style={{ flex: 1, background: 'rgba(155,34,38,.12)', border: 'none', color: '#ff6b6b', padding: '5px', borderRadius: 2, cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                      ❌ Rechazar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: '#00b450' }}>✅ Aprobada</span>
                    <button onClick={() => reject(foto.id)}
                      style={{ background: 'rgba(155,34,38,.12)', border: 'none', color: '#ff6b6b', padding: '3px 8px', borderRadius: 2, cursor: 'pointer', fontSize: '0.68rem', fontFamily: 'inherit' }}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ✅ CAMBIO 3: EmailsPanel (NUEVO) ─────────────────────────────────────────
// ─── Emails Panel ─────────────────────────────────────────────────────────────
function EmailsPanel({ showToast }: { showToast: (msg: string) => void }) {
  const [config, setConfig] = useState({
    birthday_discount: 20,
    reactivation_15_discount: 15,
    reactivation_30_discount: 20,
    reactivation_15_days: 15,
    reactivation_30_days: 30,
    birthday_valid_days: 7,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testType, setTestType] = useState<'welcome' | 'birthday_7' | 'birthday_1' | 'reactivation_15' | 'reactivation_30'>('birthday_7')
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('email_config').select('*').single()
    if (data) setConfig(data)
    setLoading(false)
  }

  async function saveConfig() {
    setSaving(true)
    const sb = createClient()
    await sb.from('email_config').update({
      birthday_discount: config.birthday_discount,
      reactivation_15_discount: config.reactivation_15_discount,
      reactivation_30_discount: config.reactivation_30_discount,
      reactivation_15_days: config.reactivation_15_days,
      reactivation_30_days: config.reactivation_30_days,
      birthday_valid_days: config.birthday_valid_days,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    setSaving(false)
    showToast('✅ Configuración guardada')
  }

  async function sendTest() {
    if (!testEmail) return showToast('Ingresa un email para la prueba')
    setSendingTest(true)
    try {
      let endpoint = ''
      let body: any = { email: testEmail, name: 'Cliente de prueba' }

      if (testType === 'welcome') {
        endpoint = '/api/send-welcome'
      } else if (testType === 'birthday_7') {
        endpoint = '/api/send-birthday'
        body = { ...body, days_until: 7 }
      } else if (testType === 'birthday_1') {
        endpoint = '/api/send-birthday'
        body = { ...body, days_until: 1 }
      } else if (testType === 'reactivation_15') {
        endpoint = '/api/send-reactivation'
        body = { ...body, days_away: 15 }
      } else if (testType === 'reactivation_30') {
        endpoint = '/api/send-reactivation'
        body = { ...body, days_away: 30 }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) showToast('✅ Email de prueba enviado')
      else showToast('Error: ' + (data.error || 'No se pudo enviar'))
    } catch (e: any) {
      showToast('Error: ' + e.message)
    }
    setSendingTest(false)
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#F5F0E8', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem', borderRadius: 2, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block', fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,.6)', marginBottom: 4 }
  const numInp = { width: 80, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#C8956A', padding: '8px', fontFamily: 'inherit', fontSize: '1rem', borderRadius: 2, outline: 'none', textAlign: 'center' as const }

  if (loading) return <div style={{ color: 'rgba(245,240,232,.3)', padding: '2rem 0' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 300, marginBottom: '0.5rem' }}>Configuración de Emails</h1>
      <p style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>Ajusta los descuentos y días de cada email automático.</p>

      {/* Cumpleaños */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '1rem' }}>🎂 Emails de Cumpleaños</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.04)', borderRadius: 4, padding: '0.75rem 1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Descuento de cumpleaños</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', marginTop: 2 }}>Aplica en ambos emails (7 días y 1 día antes)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input type="number" value={config.birthday_discount} min={1} max={50}
                onChange={e => setConfig(c => ({ ...c, birthday_discount: parseInt(e.target.value) }))}
                style={numInp} />
              <span style={{ color: 'rgba(245,240,232,.5)', fontSize: '0.85rem' }}>%</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.04)', borderRadius: 4, padding: '0.75rem 1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Válido por</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', marginTop: 2 }}>Días que dura el descuento</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input type="number" value={config.birthday_valid_days} min={1} max={30}
                onChange={e => setConfig(c => ({ ...c, birthday_valid_days: parseInt(e.target.value) }))}
                style={numInp} />
              <span style={{ color: 'rgba(245,240,232,.5)', fontSize: '0.85rem' }}>días</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reactivación */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 4, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '1rem' }}>🍣 Emails de Reactivación</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key15: 'reactivation_15_days', keyD: 'reactivation_15_discount', label: 'Primer recordatorio', desc: 'Email "Te extrañamos" — días sin comprar' },
            { key15: 'reactivation_30_days', keyD: 'reactivation_30_discount', label: 'Segundo recordatorio', desc: 'Email "Un mes sin sushi" — días sin comprar' },
          ].map(({ key15, keyD, label, desc }) => (
            <div key={key15} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.04)', borderRadius: 4, padding: '0.75rem 1rem', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,.4)', marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input type="number" value={(config as any)[key15]} min={1} max={365}
                    onChange={e => setConfig(c => ({ ...c, [key15]: parseInt(e.target.value) }))}
                    style={numInp} />
                  <span style={{ color: 'rgba(245,240,232,.4)', fontSize: '0.75rem' }}>días</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <input type="number" value={(config as any)[keyD]} min={1} max={50}
                    onChange={e => setConfig(c => ({ ...c, [keyD]: parseInt(e.target.value) }))}
                    style={numInp} />
                  <span style={{ color: 'rgba(245,240,232,.5)', fontSize: '0.85rem' }}>%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={saveConfig} disabled={saving}
        style={{ background: '#1B2A4A', color: '#F5EDE8', border: 'none', padding: '12px 28px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', marginBottom: '2rem' }}>
        {saving ? 'Guardando...' : '💾 Guardar configuración'}
      </button>

      {/* Test de emails */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 4, padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#C8956A', marginBottom: '1rem' }}>🧪 Enviar email de prueba</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={lbl}>Email destino</label>
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
              placeholder="tu@email.com" style={inp} />
          </div>
          <div>
            <label style={lbl}>Tipo de email</label>
            <select value={testType} onChange={e => setTestType(e.target.value as any)}
              style={{ ...inp, cursor: 'pointer' }}>
              <option value="welcome">✉️ Bienvenida</option>
              <option value="birthday_7">🎂 Cumpleaños — 7 días antes</option>
              <option value="birthday_1">🎉 Cumpleaños — 1 día antes</option>
              <option value="reactivation_15">🍣 Reactivación 15 días</option>
              <option value="reactivation_30">😢 Reactivación 30 días</option>
            </select>
          </div>
        </div>
        <button onClick={sendTest} disabled={sendingTest || !testEmail}
          style={{ background: sendingTest || !testEmail ? 'rgba(200,149,106,.3)' : '#C8956A', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 2, cursor: sendingTest || !testEmail ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }}>
          {sendingTest ? 'Enviando...' : '📧 Enviar prueba'}
        </button>
      </div>
    </div>
  )
}