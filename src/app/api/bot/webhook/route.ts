export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Verificación webhook Meta ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── Recibir mensajes ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (!messages?.length) return NextResponse.json({ ok: true })

    const message = messages[0]
    const phone = message.from
    const text = message.text?.body?.trim() || ''
    const messageId = message.id

    // Evitar procesar el mismo mensaje dos veces
    const { data: existing } = await sb
      .from('bot_messages')
      .select('id')
      .eq('id', messageId)
      .single()
    if (existing) return NextResponse.json({ ok: true })

    // Procesar mensaje
    await processMessage(phone, text, messageId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Bot webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

// ─── Motor de conversación ────────────────────────────────────────────────────
async function processMessage(phone: string, text: string, messageId: string) {
  // Obtener o crear conversación
  let { data: conv } = await sb
    .from('bot_conversations')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!conv) {
    const { data: newConv } = await sb
      .from('bot_conversations')
      .insert({ phone, state: 'inicio', cart: [], context: {} })
      .select().single()
    conv = newConv
  }

  // Guardar mensaje entrante
  await sb.from('bot_messages').insert({
    id: messageId,
    conversation_id: conv.id,
    direction: 'in',
    content: text,
  })

  // Actualizar último mensaje
  await sb.from('bot_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conv.id)

  // Cargar config
  const { data: configs } = await sb.from('bot_config').select('*')
  const config: Record<string, any> = {}
  configs?.forEach(c => { config[c.key] = c.value })

  // Router de estados
  let response = ''
  let newState = conv.state
  let newCart = conv.cart || []
  let newContext = conv.context || {}

  const textLower = text.toLowerCase().trim()

  switch (conv.state) {
    case 'inicio':
      response = config.mensajes?.bienvenida || '¡Hola! ¿En qué te puedo ayudar?'
      newState = 'menu_principal'
      break

    case 'menu_principal':
      if (text === '1' || textLower.includes('carta') || textLower.includes('menu')) {
        const cats = await getCategorias()
        response = `📋 *Nuestra Carta*\n\n${cats}\n\nEscribe el *número* de la categoría que te interesa:`
        newState = 'viendo_categorias'
      } else if (text === '2' || textLower.includes('pedido') || textLower.includes('pedir')) {
        const cats = await getCategorias()
        response = `🛒 *Hacer un pedido*\n\nPrimero elige una categoría:\n\n${cats}`
        newState = 'eligiendo_categoria'
      } else if (text === '3' || textLower.includes('promo')) {
        const promos = await getPromociones()
        response = promos
        newState = 'menu_principal'
      } else if (text === '4' || textLower.includes('estado') || textLower.includes('pedido')) {
        response = `📦 Para consultar tu pedido escribe tu *número de orden* (ej: #1234):`
        newState = 'consultando_pedido'
      } else {
        response = config.mensajes?.bienvenida || '¡Hola!\n\n1️⃣ Ver la carta\n2️⃣ Hacer un pedido\n3️⃣ Ver promociones\n4️⃣ Consultar mi pedido'
      }
      break

    case 'viendo_categorias':
    case 'eligiendo_categoria': {
      const cats = await getCategoriasList()
      const idx = parseInt(text) - 1
      if (idx >= 0 && idx < cats.length) {
        const cat = cats[idx]
        const productos = await getProductosByCategoria(cat.id)
        response = `🍣 *${cat.name}*\n\n${productos}\n\nEscribe el *número* del producto para agregarlo a tu carrito:\n0️⃣ Volver al menú`
        newState = 'eligiendo_producto'
        newContext = { ...newContext, categoria_id: cat.id, categoria_nombre: cat.name }
      } else if (text === '0') {
        response = config.mensajes?.bienvenida || 'Menú principal'
        newState = 'menu_principal'
      } else {
        const cats2 = await getCategorias()
        response = `No entendí eso. Por favor elige un número:\n\n${cats2}`
      }
      break
    }

    case 'eligiendo_producto': {
      if (text === '0') {
        response = config.mensajes?.bienvenida || 'Menú principal'
        newState = 'menu_principal'
        break
      }
      if (textLower === 'ver carrito' || textLower === 'carrito') {
        response = await formatCart(newCart)
        response += '\n\n✅ *Confirmar pedido*\n🔄 *Seguir comprando*\n🗑️ *Vaciar carrito*'
        newState = 'viendo_carrito'
        break
      }
      const prods = await getProductosByCategoria(newContext.categoria_id)
      const prodList = await getProductosListByCategoria(newContext.categoria_id)
      const idx = parseInt(text) - 1
      if (idx >= 0 && idx < prodList.length) {
        const prod = prodList[idx]
        const mods = await getModificaciones(prod.id)
        if (mods.length > 0) {
          newContext = { ...newContext, producto_actual: prod }
          response = `✅ *${prod.name}* - ${formatPrecio(prod.price)}\n\n¿Deseas alguna modificación?\n\n${mods}\n\n0️⃣ Sin modificaciones\n❌ Cancelar`
          newState = 'eligiendo_modificacion'
        } else {
          newCart = addToCart(newCart, prod, 1, [])
          await sb.from('bot_conversations').update({ cart: newCart }).eq('id', conv.id)
          response = `✅ *${prod.name}* agregado al carrito!\n\n${await formatCart(newCart)}\n\n📋 Ver más productos de ${newContext.categoria_nombre}\n✅ Confirmar pedido\n🏠 Menú principal (escribe 0)`
          newState = 'eligiendo_producto'
        }
      } else {
        response = `No entendí ese número. ${prods}\n\nEscribe el número del producto:`
      }
      break
    }

    case 'eligiendo_modificacion': {
      const prod = newContext.producto_actual
      if (text === '0') {
        newCart = addToCart(newCart, prod, 1, [])
        await sb.from('bot_conversations').update({ cart: newCart }).eq('id', conv.id)
        response = `✅ *${prod.name}* agregado sin modificaciones!\n\n${await formatCart(newCart)}\n\n¿Qué más deseas?\n1️⃣ Seguir eligiendo\n2️⃣ Confirmar pedido`
        newState = 'post_agregar'
      } else if (textLower === 'cancelar') {
        response = `Cancelado. ¿Qué deseas hacer?\n1️⃣ Ver carta\n2️⃣ Ver carrito`
        newState = 'menu_principal'
      } else {
        const mods = await getModificacionesList(prod.id)
        const idx = parseInt(text) - 1
        if (idx >= 0 && idx < mods.length) {
          const mod = mods[idx]
          newCart = addToCart(newCart, prod, 1, [mod])
          await sb.from('bot_conversations').update({ cart: newCart }).eq('id', conv.id)
          response = `✅ *${prod.name}* con *${mod.name}* agregado!\n${mod.extra_cost > 0 ? `(+${formatPrecio(mod.extra_cost)})` : ''}\n\n${await formatCart(newCart)}\n\n¿Qué más deseas?\n1️⃣ Seguir eligiendo\n2️⃣ Confirmar pedido`
          newState = 'post_agregar'
        } else {
          const modsStr = await getModificaciones(prod.id)
          response = `No entendí. Por favor elige:\n\n${modsStr}\n\n0️⃣ Sin modificaciones`
        }
      }
      break
    }

    case 'post_agregar': {
      if (text === '1' || textLower.includes('seguir') || textLower.includes('más')) {
        const cats = await getCategorias()
        response = `¿De qué categoría quieres pedir?\n\n${cats}`
        newState = 'eligiendo_categoria'
        break
      } else if (text === '2' || textLower.includes('confirmar') || textLower.includes('pedido')) {
        response = await formatCart(newCart)
        response += '\n\n¿Este pedido es para:\n🏃 *1. Retiro* en el local\n🛵 *2. Delivery* a domicilio'
        newState = 'eligiendo_tipo_pedido'
        break
      } else {
        response = '¿Qué deseas hacer?\n1️⃣ Seguir eligiendo\n2️⃣ Confirmar pedido'
        break
      }
    }

    case 'viendo_carrito': {
      if (textLower.includes('confirmar') || text === '1') {
        response = '¿Este pedido es para:\n🏃 *1. Retiro* en el local\n🛵 *2. Delivery* a domicilio'
        newState = 'eligiendo_tipo_pedido'
        break
      } else if (textLower.includes('seguir') || text === '2') {
        const cats = await getCategorias()
        response = `¿De qué categoría quieres pedir?\n\n${cats}`
        newState = 'eligiendo_categoria'
        break
      } else if (textLower.includes('vaciar') || text === '3') {
        newCart = []
        await sb.from('bot_conversations').update({ cart: [] }).eq('id', conv.id)
        response = '🗑️ Carrito vaciado.\n\n¿Qué deseas hacer?\n1️⃣ Ver la carta\n2️⃣ Volver al menú'
        newState = 'menu_principal'
        break
      } else {
        response = '1️⃣ Confirmar pedido\n2️⃣ Seguir comprando\n3️⃣ Vaciar carrito'
        break
      }
    }

    case 'eligiendo_tipo_pedido': {
      if (text === '1' || textLower.includes('retiro')) {
        newContext = { ...newContext, order_type: 'retiro' }
        response = `🏃 *Retiro en el local*\n📍 Lynch Sur #17, La Reina\n\n¿Cuál es tu nombre?`
        newState = 'pidiendo_nombre'
      } else if (text === '2' || textLower.includes('delivery')) {
        newContext = { ...newContext, order_type: 'delivery' }
        const deliveryConfig = config.delivery || {}
        const comunas = deliveryConfig.comunas?.join(', ') || 'comunas cercanas'
        response = `🛵 *Delivery disponible en:*\n${comunas}\n\n¿Cuál es tu dirección de entrega?`
        newState = 'pidiendo_direccion'
      } else {
        response = '¿Retiro o delivery?\n1️⃣ Retiro\n2️⃣ Delivery'
      }
      break
    }

    case 'pidiendo_direccion': {
      newContext = { ...newContext, address: text }
      const costoEnvio = config.costo_envio?.base || 2000
      response = `📍 Dirección: *${text}*\n🚀 Costo de envío: *${formatPrecio(costoEnvio)}*\n\n¿Cuál es tu nombre?`
      newState = 'pidiendo_nombre'
      break
    }

    case 'pidiendo_nombre': {
      newContext = { ...newContext, customer_name: text }
      await sb.from('bot_conversations').update({ customer_name: text }).eq('id', conv.id)
      response = `¡Hola *${text}*! 👋\n¿Cuál es tu número de teléfono para confirmar el pedido?`
      newState = 'pidiendo_telefono'
      break
    }

    case 'pidiendo_telefono': {
      newContext = { ...newContext, customer_phone: text }
      const cartTotal = calcTotal(newCart)
      const deliveryCost = newContext.order_type === 'delivery' ? (config.costo_envio?.base || 2000) : 0
      const total = cartTotal + deliveryCost
      const tiempoBase = config.tiempos_cocina?.base_minutos || 20

      response = `📋 *RESUMEN DE TU PEDIDO*\n\n`
      response += await formatCart(newCart)
      if (deliveryCost > 0) response += `\n🚀 Delivery: ${formatPrecio(deliveryCost)}`
      response += `\n💰 *TOTAL: ${formatPrecio(total)}*`
      response += `\n⏱️ Tiempo estimado: *${tiempoBase} min*`
      response += `\n\n¿Confirmas tu pedido?\n✅ *SI* para confirmar\n❌ *NO* para cancelar`
      newState = 'confirmando_pedido'
      break
    }

    case 'confirmando_pedido': {
      if (textLower === 'si' || textLower === 'sí' || textLower === 'confirmar') {
        const order = await createOrder(conv, newCart, newContext, config)
        if (order) {
          response = `🎉 *¡Pedido confirmado!*\n\n📦 Número de orden: *#${order.order_number}*\n`
          response += `⏱️ Tiempo estimado: *${config.tiempos_cocina?.base_minutos || 20} min*\n`
          if (newContext.order_type === 'delivery') response += `🛵 Delivery a: ${newContext.address}\n`
          else response += `🏃 Retiro en: Lynch Sur #17, La Reina\n`
          response += `\n¡Gracias por tu pedido! 🍣`

          newCart = []
          newContext = {}
          newState = 'menu_principal'
          await sb.from('bot_conversations').update({ cart: [], context: {}, state: 'menu_principal', customer_name: newContext.customer_name }).eq('id', conv.id)
          await printTicket(order, newCart, newContext)
        } else {
          response = 'Hubo un error al crear tu pedido. Por favor intenta de nuevo o escríbenos directamente.'
          newState = 'menu_principal'
        }
        break
      } else if (textLower === 'no' || textLower === 'cancelar') {
        response = '❌ Pedido cancelado.\n\n¿Qué deseas hacer?\n1️⃣ Volver a la carta\n2️⃣ Vaciar carrito'
        newCart = []
        newState = 'menu_principal'
        break
      } else {
        response = '¿Confirmas tu pedido?\n✅ *SI* para confirmar\n❌ *NO* para cancelar'
        break
      }
    }

    case 'consultando_pedido': {
      const orderNum = text.replace('#', '').trim()
      const { data: order } = await sb.from('orders').select('*').eq('order_number', orderNum).single()
      if (order) {
        const statusMap: Record<string, string> = {
          nuevo: '📥 Recibido', preparando: '👨‍🍳 En preparación',
          listo: '✅ Listo para retiro', entregado: '🛵 Despachado', cancelado: '❌ Cancelado'
        }
        response = `📦 *Pedido #${order.order_number}*\n\nEstado: ${statusMap[order.status] || order.status}\nTotal: ${formatPrecio(order.total)}`
      } else {
        response = `No encontré el pedido *#${orderNum}*. Verifica el número e intenta nuevamente.`
      }
      newState = 'menu_principal'
      break
    }

    default:
      response = config.mensajes?.bienvenida || '¡Hola! ¿En qué te puedo ayudar?'
      newState = 'menu_principal'
      break
  }

  // Actualizar estado de conversación
  await sb.from('bot_conversations').update({
    state: newState,
    cart: newCart,
    context: newContext,
  }).eq('id', conv.id)

  // Enviar respuesta
  if (response) await sendWhatsAppMessage(phone, response, conv.id)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrecio(n: number) { return `$${n.toLocaleString('es-CL')}` }

function addToCart(cart: any[], product: any, qty: number, mods: any[]) {
  const existing = cart.find(i => i.product_id === product.id && JSON.stringify(i.modifications) === JSON.stringify(mods))
  if (existing) return cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i)
  return [...cart, { product_id: product.id, product_name: product.name, unit_price: product.price, quantity: qty, modifications: mods, mod_cost: mods.reduce((a: number, m: any) => a + (m.extra_cost || 0), 0) }]
}

function calcTotal(cart: any[]) {
  return cart.reduce((a, i) => a + (i.unit_price + i.mod_cost) * i.quantity, 0)
}

async function formatCart(cart: any[]) {
  if (!cart?.length) return '🛒 Tu carrito está vacío'
  let txt = '🛒 *Tu carrito:*\n'
  cart.forEach(i => {
    txt += `\n• ${i.product_name} ×${i.quantity} — ${formatPrecio((i.unit_price + i.mod_cost) * i.quantity)}`
    if (i.modifications?.length) txt += `\n  _(${i.modifications.map((m: any) => m.name).join(', ')})_`
  })
  txt += `\n\n💰 Subtotal: *${formatPrecio(calcTotal(cart))}*`
  return txt
}

async function getCategoriasList() {
  const { data } = await sb.from('categories').select('id, name, slug').eq('active', true).order('sort_order')
  return data || []
}

async function getCategorias() {
  const cats = await getCategoriasList()
  return cats.map((c, i) => `${i + 1}️⃣ ${c.name}`).join('\n')
}

async function getProductosListByCategoria(categoryId: number) {
  const { data } = await sb.from('products').select('id, name, price, description').eq('category_id', categoryId).eq('active', true).order('sort_order')
  return data || []
}

async function getProductosByCategoria(categoryId: number) {
  const prods = await getProductosListByCategoria(categoryId)
  return prods.map((p, i) => `${i + 1}️⃣ *${p.name}* — ${formatPrecio(p.price)}${p.description ? `\n   _${p.description}_` : ''}`).join('\n')
}

async function getModificacionesList(productId: string) {
  const { data } = await sb.from('product_modifications').select('*').eq('product_id', productId).eq('active', true)
  return data || []
}

async function getModificaciones(productId: string) {
  const mods = await getModificacionesList(productId)
  if (!mods.length) return ''
  return mods.map((m, i) => `${i + 1}️⃣ ${m.name}${m.extra_cost > 0 ? ` (+${formatPrecio(m.extra_cost)})` : ''}`).join('\n')
}

async function getPromociones() {
  const { data: cat } = await sb.from('categories').select('id').eq('slug', 'promociones').single()
  if (!cat) return 'No hay promociones disponibles en este momento.'
  const { data: prods } = await sb.from('products').select('*').eq('category_id', cat.id).eq('active', true)
  if (!prods?.length) return 'No hay promociones disponibles en este momento.'
  let txt = '🔥 *Promociones del mes:*\n\n'
  prods.forEach((p, i) => { txt += `${i + 1}️⃣ *${p.name}* — ${formatPrecio(p.price)}\n${p.description ? `   ${p.description}\n` : ''}` })
  return txt
}

async function createOrder(conv: any, cart: any[], context: any, config: any) {
  try {
    const { data: lastOrder } = await sb.from('orders').select('order_number').order('created_at', { ascending: false }).limit(1).single()
    const orderNumber = (lastOrder?.order_number || 1000) + 1
    const subtotal = calcTotal(cart)
    const deliveryCost = context.order_type === 'delivery' ? (config.costo_envio?.base || 2000) : 0
    const total = subtotal + deliveryCost

    const { data: order } = await sb.from('orders').insert({
      order_number: orderNumber,
      customer_name: context.customer_name || 'Cliente WhatsApp',
      customer_phone: conv.phone,
      order_type: context.order_type || 'retiro',
      delivery_address: context.address || null,
      payment_method: 'transferencia',
      status: 'nuevo',
      subtotal,
      delivery_cost: deliveryCost,
      total,
      notes: 'Pedido por WhatsApp',
    }).select().single()

    if (order) {
      await sb.from('order_items').insert(
        cart.map(i => ({
          order_id: order.id,
          product_id: i.product_id,
          product_name: i.product_name,
          unit_price: i.unit_price + i.mod_cost,
          quantity: i.quantity,
          modifications: i.modifications,
        }))
      )
    }
    return order
  } catch (e) { console.error('Error creating order:', e); return null }
}

async function sendWhatsAppMessage(phone: string, message: string, convId: string) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    console.log('WhatsApp credentials not configured. Message would be:', message)
    return
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    })

    if (res.ok) {
      await sb.from('bot_messages').insert({ conversation_id: convId, direction: 'out', content: message })
    }
  } catch (e) { console.error('Error sending WhatsApp message:', e) }
}

async function printTicket(order: any, cart: any[], context: any) {
  const printerUrl = process.env.PRINTER_URL
  if (!printerUrl) return

  try {
    await fetch(`${printerUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.PRINTER_API_KEY || '' },
      body: JSON.stringify({ order, cart, context }),
    })
  } catch (e) { console.error('Error printing ticket:', e) }
}