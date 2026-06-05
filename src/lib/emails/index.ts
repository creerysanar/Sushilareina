// lib/emails/index.ts
// Todas las funciones de envío de emails con Resend

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'hola@sushilareina.cl'
const ADMIN = process.env.ADMIN_EMAIL || 'admin@sushilareina.cl'
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sushilareina.cl'

// ─────────────────────────────────────────────────────────────
// Confirmación de pedido al cliente
// ─────────────────────────────────────────────────────────────
export async function sendOrderConfirmationEmail(order: any, to: string) {
  const itemsHtml = order.items
    .map((i: any) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0ebe0">${i.product_name} ×${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0ebe0;text-align:right;color:#C8001C;font-weight:600">
        $${(i.unit_price * i.quantity).toLocaleString('es-CL')}
      </td>
    </tr>`).join('')

  const html = baseTemplate(`
    <h2 style="color:#C8001C;font-family:Georgia,serif;margin:0 0 8px">¡Pedido recibido! 🍣</h2>
    <p style="color:#555;margin:0 0 24px">Hola, tu pedido <strong>#${order.order_number}</strong> fue recibido correctamente.</p>

    <div style="background:#fdf6e3;border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 12px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.06em">Detalle del pedido</p>
      <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
      ${order.delivery_cost > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ebe0">
        <span style="color:#666">Despacho</span>
        <span>$${order.delivery_cost.toLocaleString('es-CL')}</span>
      </div>` : ''}
      ${order.discount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ebe0">
        <span style="color:#666">Descuento (${order.coupon_code})</span>
        <span style="color:#00a03c">-$${order.discount.toLocaleString('es-CL')}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:12px 0 0;font-size:18px;font-weight:700">
        <span>Total</span>
        <span style="color:#C8001C">$${order.total.toLocaleString('es-CL')}</span>
      </div>
    </div>

    <div style="background:#fff5f5;border-left:4px solid #C8001C;padding:16px;border-radius:4px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;color:#666">
        <strong>Tipo de entrega:</strong> ${order.order_type === 'retiro' ? '🏪 Retiro en local — Lynch Sur #17, La Reina' : `🛵 Delivery a ${order.delivery_address}`}<br>
        <strong>Método de pago:</strong> ${order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}
      </p>
    </div>

    ${order.payment_method === 'transferencia' ? `
    <div style="background:#fffbf0;border:1px solid #D4A017;padding:16px;border-radius:8px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-weight:600;color:#D4A017">Datos para transferencia:</p>
      <p style="margin:0;font-size:13px;color:#666;line-height:1.8">
        Banco: <strong>BancoEstado</strong><br>
        Cuenta: <strong>Vista</strong><br>
        Envía el comprobante al WhatsApp: <strong>+56 9 7106 1232</strong>
      </p>
    </div>` : ''}

    <p style="color:#888;font-size:13px;text-align:center">
      ¿Preguntas? Escríbenos al <a href="https://wa.me/56971061232" style="color:#C8001C">+56 9 7106 1232</a>
    </p>
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Pedido #${order.order_number} recibido — Sushi La Reina`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────
// Notificación al restaurante de nuevo pedido
// ─────────────────────────────────────────────────────────────
export async function sendNewOrderNotification(order: any) {
  const itemsList = order.items
    .map((i: any) => `• ${i.product_name} ×${i.quantity} = $${(i.unit_price * i.quantity).toLocaleString('es-CL')}`)
    .join('\n')

  const html = baseTemplate(`
    <h2 style="color:#C8001C;font-family:Georgia,serif">🍣 Nuevo pedido #${order.order_number}</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Cliente</td><td style="font-weight:600">${order.customer_name}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Teléfono</td><td>${order.customer_phone}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Tipo</td><td>${order.order_type === 'retiro' ? 'Retiro' : 'Delivery'}</td></tr>
      ${order.order_type === 'delivery' ? `<tr><td style="padding:6px 0;color:#888;font-size:13px">Dirección</td><td>${order.delivery_address}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Pago</td><td>${order.payment_method}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Total</td><td style="color:#C8001C;font-weight:700;font-size:18px">$${order.total.toLocaleString('es-CL')}</td></tr>
    </table>
    <div style="background:#fdf6e3;padding:16px;border-radius:8px;margin-top:16px;font-family:monospace;font-size:13px;white-space:pre-wrap">${itemsList}</div>
    <a href="${SITE}/admin" style="display:block;background:#C8001C;color:#fff;text-align:center;padding:14px;border-radius:4px;margin-top:20px;text-decoration:none;font-weight:600">Ver en Panel Admin →</a>
  `)

  return resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `🔔 Nuevo pedido #${order.order_number} — $${order.total.toLocaleString('es-CL')}`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────
// Bienvenida al registrarse
// ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  const html = baseTemplate(`
    <h2 style="color:#C8001C;font-family:Georgia,serif">¡Bienvenido/a, ${name}! 🍣</h2>
    <p style="color:#555">Gracias por unirte a la familia de <strong>Sushi La Reina</strong>. Tu cuenta está lista para que hagas tus pedidos de forma rápida y sencilla.</p>
    <div style="background:#fdf6e3;border-radius:8px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px;font-weight:600">¿Qué puedes hacer ahora?</p>
      <ul style="margin:0;padding-left:20px;color:#555;line-height:1.8">
        <li>Pedir en línea con retiro o delivery</li>
        <li>Ver el historial de tus pedidos</li>
        <li>Recibir promociones exclusivas y descuentos en tus fechas especiales</li>
      </ul>
    </div>
    <a href="${SITE}" style="display:block;background:#C8001C;color:#fff;text-align:center;padding:14px;border-radius:4px;text-decoration:none;font-weight:600">Ver la Carta →</a>
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `¡Bienvenido/a a Sushi La Reina, ${name}!`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────
// Re-engagement (cliente sin compra en 30-45 días)
// ─────────────────────────────────────────────────────────────
export async function sendReengagementEmail({
  to, customerName, daysSince, lastOrder, couponCode, couponDiscount, expiresIn
}: {
  to: string; customerName: string; daysSince: number
  lastOrder: any; couponCode?: string; couponDiscount: number; expiresIn: number
}) {
  const firstName = customerName.split(' ')[0]
  const lastItem = lastOrder?.items?.[0]?.product_name || 'Sushi La Reina'

  const html = baseTemplate(`
    <h2 style="color:#C8001C;font-family:Georgia,serif">¡Te extrañamos, ${firstName}! 🍣</h2>
    <p style="color:#555">Han pasado <strong>${daysSince} días</strong> desde tu último pedido. ¡Es hora de volver!</p>
    ${lastItem ? `<p style="color:#888;font-size:14px">La última vez pediste: <em>${lastItem}</em> — ¿lo volvemos a hacer?</p>` : ''}

    ${couponCode ? `
    <div style="background:#fff5f5;border:2px dashed #C8001C;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
      <p style="margin:0 0 8px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:.08em">Tu descuento exclusivo</p>
      <div style="font-size:32px;font-weight:700;font-family:monospace;color:#C8001C;letter-spacing:.1em">${couponCode}</div>
      <p style="margin:8px 0 0;color:#666;font-size:13px">${couponDiscount}% de descuento · válido por ${expiresIn} días · mínimo $8.000</p>
    </div>` : ''}

    <a href="${SITE}" style="display:block;background:#C8001C;color:#fff;text-align:center;padding:14px;border-radius:4px;text-decoration:none;font-weight:600;margin-bottom:16px">
      Ver la Carta y Pedir →
    </a>
    <p style="color:#aaa;font-size:12px;text-align:center">Lynch Sur #17 · La Reina · +56 9 7106 1232</p>
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `¡Te extrañamos, ${firstName}! 🍣 Aquí tienes un ${couponDiscount}% de descuento`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────
// Cumpleaños
// ─────────────────────────────────────────────────────────────
export async function sendBirthdayEmail({
  to, customerName, couponCode, discountPercent, validDays, minOrder
}: {
  to: string; customerName: string; couponCode?: string
  discountPercent: number; validDays: number; minOrder: number
}) {
  const firstName = customerName.split(' ')[0]

  const html = baseTemplate(`
    <div style="text-align:center;font-size:48px;margin-bottom:8px">🎂</div>
    <h2 style="color:#C8001C;font-family:Georgia,serif;text-align:center">¡Feliz Cumpleaños, ${firstName}!</h2>
    <p style="color:#555;text-align:center">En tu día especial, queremos celebrar contigo. Aquí tienes un regalo de parte de toda la familia de <strong>Sushi La Reina</strong>.</p>

    ${couponCode ? `
    <div style="background:linear-gradient(135deg,#C8001C,#8B0010);border-radius:12px;padding:28px;text-align:center;margin:24px 0">
      <p style="margin:0 0 8px;color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:.1em">Tu regalo de cumpleaños</p>
      <div style="font-size:36px;font-weight:700;font-family:monospace;color:#D4A017;letter-spacing:.12em">${couponCode}</div>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:14px">
        ${discountPercent}% de descuento en tu pedido<br>
        Válido por ${validDays} días · Mínimo $${minOrder.toLocaleString('es-CL')}
      </p>
    </div>` : ''}

    <a href="${SITE}" style="display:block;background:#C8001C;color:#fff;text-align:center;padding:14px;border-radius:4px;text-decoration:none;font-weight:600;margin-bottom:16px">
      🍣 Pedir ahora →
    </a>
    <p style="color:#aaa;font-size:12px;text-align:center">Con mucho cariño, el equipo de Sushi La Reina</p>
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎂 ¡Feliz Cumpleaños, ${firstName}! Un regalo de Sushi La Reina`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────
// Aniversario (pololeo / matrimonio / fecha especial)
// ─────────────────────────────────────────────────────────────
export async function sendAnniversaryEmail({
  to, customerName, dateLabel, couponCode, discountPercent, validDays
}: {
  to: string; customerName: string; dateLabel: string
  couponCode?: string; discountPercent: number; validDays: number
}) {
  const firstName = customerName.split(' ')[0]
  const emoji = dateLabel.includes('matrimonio') ? '💍' : '💑'

  const html = baseTemplate(`
    <div style="text-align:center;font-size:48px;margin-bottom:8px">${emoji}</div>
    <h2 style="color:#C8001C;font-family:Georgia,serif;text-align:center">¡Feliz ${dateLabel}, ${firstName}!</h2>
    <p style="color:#555;text-align:center">En Sushi La Reina queremos ser parte de tu celebración. Por eso, aquí tienes un descuento especial para que lo disfrutes con quien más quieres.</p>

    ${couponCode ? `
    <div style="background:#fdf6e3;border:2px dashed #D4A017;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
      <p style="margin:0 0 8px;color:#888;font-size:13px">Cupón especial para ti</p>
      <div style="font-size:32px;font-weight:700;font-family:monospace;color:#C8001C;letter-spacing:.1em">${couponCode}</div>
      <p style="margin:8px 0 0;color:#666;font-size:13px">${discountPercent}% de descuento · Válido por ${validDays} días</p>
    </div>` : ''}

    <a href="${SITE}" style="display:block;background:#C8001C;color:#fff;text-align:center;padding:14px;border-radius:4px;text-decoration:none;font-weight:600">
      🍣 Celebrar con Sushi La Reina →
    </a>
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${emoji} ¡Feliz ${dateLabel}, ${firstName}! Un regalo especial para celebrar`,
    html,
  })
}

export async function sendSpecialDateEmail({
  to, customerName, dateLabel, couponCode, discountPercent, validDays
}: {
  to: string; customerName: string; dateLabel: string
  couponCode?: string; discountPercent: number; validDays: number
}) {
  return sendAnniversaryEmail({ to, customerName, dateLabel, couponCode, discountPercent, validDays })
}

// ─────────────────────────────────────────────────────────────
// Alerta de producto lento al admin
// ─────────────────────────────────────────────────────────────
export async function sendSlowProductAlertEmail({
  to, products
}: {
  to: string; products: { product_name: string; days_without_sale: number }[]
}) {
  const rows = products.map(p =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #f0ebe0">${p.product_name}</td>
      <td style="padding:8px;border-bottom:1px solid #f0ebe0;color:#C8001C;text-align:right">${p.days_without_sale} días sin venta</td>
    </tr>`
  ).join('')

  const html = baseTemplate(`
    <h2 style="color:#C8001C;font-family:Georgia,serif">📉 Productos sin ventas recientes</h2>
    <p style="color:#555">El agente detectó estos productos sin ventas en los últimos 14 días. Considera crear una promoción o revisar el precio.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">${rows}</table>
    <a href="${SITE}/admin" style="display:block;background:#C8001C;color:#fff;text-align:center;padding:14px;border-radius:4px;text-decoration:none;font-weight:600">
      Ver Panel Admin →
    </a>
  `)

  return resend.emails.send({ from: FROM, to, subject: `📉 ${products.length} productos sin ventas — Sushi La Reina`, html })
}

// ─────────────────────────────────────────────────────────────
// Template base
// ─────────────────────────────────────────────────────────────
function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#0A0A0A;padding:24px 32px;display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;background:#C8001C;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px">🍣</div>
      <div>
        <div style="font-family:Georgia,serif;font-size:18px;color:#F5F0E8;letter-spacing:.05em">Sushi La Reina</div>
        <div style="font-size:11px;color:rgba(245,240,232,0.4);letter-spacing:.1em;text-transform:uppercase">Lynch Sur #17 · La Reina</div>
      </div>
    </div>
    <!-- Content -->
    <div style="padding:32px">${content}</div>
    <!-- Footer -->
    <div style="background:#f8f5f0;padding:20px 32px;text-align:center;border-top:1px solid #f0ebe0">
      <p style="margin:0;font-size:12px;color:#aaa;line-height:1.8">
        Sushi La Reina · Lynch Sur #17, La Reina, Santiago<br>
        <a href="tel:+56971061232" style="color:#C8001C">+56 9 7106 1232</a> ·
        <a href="${SITE}" style="color:#C8001C">sushilareina.cl</a><br>
        <a href="${SITE}/unsubscribe" style="color:#ccc;font-size:11px">Cancelar suscripción</a>
      </p>
    </div>
  </div>
</body></html>`
}
