import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

// Este endpoint lo llama Supabase pg_cron automáticamente
// También se puede llamar con POST { email, name, days_until, discount_code }
export async function POST(request: NextRequest) {
  try {
    const { email, name, days_until, discount_code } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const isOneWeek = days_until === 7
    const isOneDay = days_until === 1

    const subject = isOneWeek
      ? `🎂 ¡Tu cumpleaños se acerca! Tenemos un regalo para ti`
      : `🎉 ¡Mañana es tu gran día! Tu descuento de cumpleaños te espera`

    const headline = isOneWeek
      ? `¡Se acerca tu cumpleaños, ${name || 'amigo/a'}!`
      : `¡Mañana es tu gran día, ${name || 'amigo/a'}! 🎉`

    const message = isOneWeek
      ? `Faltan solo <strong>7 días</strong> para tu cumpleaños y en Sushi La Reina lo queremos celebrar contigo. Tenemos un regalo especial esperándote.`
      : `Mañana cumples años y queremos que lo celebres con nosotros. Ven a Sushi La Reina y disfruta de tu día con este descuento exclusivo para ti.`

    const ctaText = isOneWeek
      ? 'Ver la Carta y planificar →'
      : '¡Pedir ahora con mi descuento! →'

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

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;border:1px solid #C8956A;color:#C8956A;padding:5px 20px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:20px;font-family:Helvetica,sans-serif;">
        Lynch Sur #17 · La Reina · Santiago
      </div>
      <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:300;color:#1B2A4A;margin:0 0 8px;">
        Sushi La <em style="color:#C8956A;">Reina</em>
      </h1>
    </div>

    <!-- Card principal -->
    <div style="background:white;border-radius:4px;padding:40px;margin-bottom:24px;border:1px solid rgba(27,42,74,.08);">
      
      <!-- Emoji grande -->
      <div style="text-align:center;font-size:56px;margin-bottom:24px;">
        ${isOneWeek ? '🎂' : '🎉'}
      </div>

      <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1B2A4A;margin:0 0 16px;text-align:center;">
        ${headline}
      </h2>

      <p style="font-family:Helvetica,sans-serif;font-size:14px;color:rgba(27,42,74,.65);line-height:1.7;margin:0 0 28px;text-align:center;">
        ${message}
      </p>

      <!-- Descuento destacado -->
      <div style="background:linear-gradient(135deg,#1B2A4A,#0A1628);border-radius:4px;padding:28px;margin-bottom:28px;text-align:center;">
        <p style="font-family:Helvetica,sans-serif;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,237,232,.5);margin:0 0 8px;">
          Tu regalo de cumpleaños
        </p>
        <p style="font-family:Georgia,serif;font-size:42px;font-weight:700;color:#C8956A;margin:0 0 4px;">
          20% OFF
        </p>
        <p style="font-family:Helvetica,sans-serif;font-size:13px;color:rgba(245,237,232,.7);margin:0 0 16px;">
          en tu próximo pedido
        </p>
        ${discount_code ? `
        <div style="background:rgba(200,149,106,.15);border:1px dashed #C8956A;border-radius:2px;padding:10px 20px;display:inline-block;">
          <p style="font-family:Helvetica,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,237,232,.5);margin:0 0 4px;">Código</p>
          <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F5EDE8;margin:0;letter-spacing:.1em;">${discount_code}</p>
        </div>
        ` : `
        <p style="font-family:Helvetica,sans-serif;font-size:12px;color:rgba(245,237,232,.5);margin:0;">
          Muestra este email al momento de pagar
        </p>
        `}
      </div>

      <!-- Beneficios -->
      <div style="background:#F5EDE8;border-radius:4px;padding:20px;margin-bottom:28px;">
        <p style="font-family:Helvetica,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(27,42,74,.4);margin:0 0 12px;">
          Incluye
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">🍣 20% de descuento en todo el pedido</td></tr>
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">🛵 Válido para retiro y delivery</td></tr>
          <tr><td style="padding:5px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">📅 Válido durante tu semana de cumpleaños</td></tr>
        </table>
      </div>

      <div style="text-align:center;">
        <a href="https://sushilareina.cl" style="display:inline-block;background:#1B2A4A;color:#F5EDE8;text-decoration:none;padding:14px 36px;font-family:Helvetica,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;">
          ${ctaText}
        </a>
      </div>
    </div>

    <!-- Footer -->
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
    console.error('send-birthday error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
