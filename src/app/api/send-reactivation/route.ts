import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, name, days_away } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    // Leer descuento desde Supabase
    const { data: config } = await supabase
      .from('email_config')
      .select('reactivation_15_discount, reactivation_30_discount')
      .single()

    const discount = days_away >= 30
      ? (config?.reactivation_30_discount ?? 20)
      : (config?.reactivation_15_discount ?? 15)

    const is30 = days_away >= 30

    const subject = is30
      ? `${name ? name + ', u' : 'U'}n mes sin sushi... eso no puede ser 🍣`
      : `${name ? name + ', t' : 'T'}e extrañamos 🍣 ¿Cuándo volvemos a verte?`

    const headline = is30
      ? `¡${name ? name + ', un' : 'Un'} mes sin sushi!`
      : `${name ? `${name}, te extrañamos` : 'Te extrañamos'}`

    const message = is30
      ? `Llevamos <strong>${days_away} días</strong> sin verte y eso nos preocupa. Un mes sin sushi es demasiado tiempo. Vuelve hoy y te damos nuestro mejor descuento.`
      : `Han pasado <strong>${days_away} días</strong> desde tu último pedido y la verdad... nos hace falta verte por aquí.`

    const { data, error } = await resend.emails.send({
      from: 'Sushi La Reina <hola@sushilareina.cl>',
      to: [email],
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F5EDE8;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;border:1px solid #C8956A;color:#C8956A;padding:5px 20px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:20px;font-family:Helvetica,sans-serif;">
        Lynch Sur #17 · La Reina · Santiago
      </div>
      <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:300;color:#1B2A4A;margin:0;">
        Sushi La <em style="color:#C8956A;">Reina</em>
      </h1>
    </div>

    <div style="background:white;border-radius:4px;padding:40px;margin-bottom:24px;border:1px solid rgba(27,42,74,.08);">

      <div style="text-align:center;font-size:56px;margin-bottom:24px;">${is30 ? '😢' : '🍣'}</div>

      <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1B2A4A;margin:0 0 16px;text-align:center;">
        ${headline}
      </h2>

      <p style="font-family:Helvetica,sans-serif;font-size:14px;color:rgba(27,42,74,.65);line-height:1.8;margin:0 0 12px;text-align:center;">
        ${message}
      </p>

      <p style="font-family:Georgia,serif;font-size:17px;color:#1B2A4A;line-height:1.7;margin:0 0 28px;text-align:center;font-style:italic;">
        "Un sushi nunca está de más.<br>No es un lujo, es una necesidad."
      </p>

      <div style="background:linear-gradient(135deg,#1B2A4A,#0A1628);border-radius:4px;padding:28px;margin-bottom:28px;text-align:center;">
        <p style="font-family:Helvetica,sans-serif;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,237,232,.5);margin:0 0 8px;">
          Por volver, te regalamos
        </p>
        <p style="font-family:Georgia,serif;font-size:42px;font-weight:700;color:#C8956A;margin:0 0 4px;">
          ${discount}% OFF
        </p>
        <p style="font-family:Helvetica,sans-serif;font-size:13px;color:rgba(245,237,232,.7);margin:0 0 16px;">
          en tu próximo pedido
        </p>
        <p style="font-family:Helvetica,sans-serif;font-size:12px;color:rgba(245,237,232,.4);margin:0;">
          Muestra este email al momento de pagar · Válido por 7 días
        </p>
      </div>

      <div style="background:#F5EDE8;border-radius:4px;padding:20px;margin-bottom:28px;">
        <p style="font-family:Helvetica,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(27,42,74,.4);margin:0 0 12px;">
          Lo que te espera
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">🍱 Rolls frescos del día</td></tr>
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">🛵 Delivery a tu puerta</td></tr>
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">⭐ Timbres acumulados esperándote</td></tr>
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">💛 El mismo cariño de siempre</td></tr>
        </table>
      </div>

      <div style="text-align:center;">
        <a href="https://sushilareina.cl" style="display:inline-block;background:#1B2A4A;color:#F5EDE8;text-decoration:none;padding:14px 36px;font-family:Helvetica,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;">
          ¡Volver a pedir ahora! →
        </a>
      </div>
    </div>

    <div style="text-align:center;">
      <p style="font-family:Helvetica,sans-serif;font-size:12px;color:rgba(27,42,74,.4);margin:0 0 4px;">
        📍 Lynch Sur #17, La Reina · Santiago
      </p>
      <p style="font-family:Helvetica,sans-serif;font-size:12px;color:rgba(27,42,74,.4);margin:0 0 4px;">
        Lun–Jue 12:00–22:30 · Vie–Sáb 12:00–00:00 · Dom 12:00–22:15
      </p>
      <p style="font-family:Helvetica,sans-serif;font-size:11px;color:rgba(27,42,74,.25);margin:16px 0 0;">
        © 2025 Sushi La Reina · <a href="https://sushilareina.cl" style="color:rgba(27,42,74,.35);">sushilareina.cl</a>
      </p>
    </div>

  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error: any) {
    console.error('send-reactivation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
