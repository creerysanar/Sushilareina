import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: 'Sushi La Reina <hola@sushilareina.cl>',
      to: [email],
      subject: '¡Bienvenido/a a Sushi La Reina! 🍣',
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

    <!-- Card -->
    <div style="background:white;border-radius:4px;padding:40px;margin-bottom:24px;border:1px solid rgba(27,42,74,.08);">
      <p style="font-family:Georgia,serif;font-size:22px;color:#1B2A4A;margin:0 0 16px;">
        ¡Hola, ${name || 'bienvenido/a'}! 🍣
      </p>
      <p style="font-family:Helvetica,sans-serif;font-size:14px;color:rgba(27,42,74,.65);line-height:1.7;margin:0 0 24px;">
        Gracias por unirte a nuestra comunidad. Ya eres parte de Sushi La Reina y tienes acceso a todos los beneficios exclusivos para miembros.
      </p>

      <div style="background:#F5EDE8;border-radius:4px;padding:20px;margin-bottom:24px;">
        <p style="font-family:Helvetica,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(27,42,74,.45);margin:0 0 12px;">
          Lo que puedes hacer ahora
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">🛒 Pedir directo desde la web</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">⭐ Acumular timbres y ganar premios</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">🎂 Agregar tus fechas especiales para descuentos</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-family:Helvetica,sans-serif;font-size:13px;color:#1B2A4A;">📋 Ver el historial de tus pedidos</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;">
        <a href="https://sushilareina.cl" style="display:inline-block;background:#1B2A4A;color:#F5EDE8;text-decoration:none;padding:14px 36px;font-family:Helvetica,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;">
          Ver la Carta →
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
    console.error('send-welcome error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
