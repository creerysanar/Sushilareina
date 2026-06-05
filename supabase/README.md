# 🍣 Sushi La Reina — sushilareina.cl

Aplicación web completa para Sushi La Reina. Stack: **Next.js 14 · Supabase · Vercel · Resend**.

---

## Stack tecnológico

| Capa | Tecnología | Para qué |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Carta, checkout, auth, PWA |
| Base de datos | Supabase (PostgreSQL) | Usuarios, pedidos, productos, analytics |
| Auth | Supabase Auth | Login/registro de clientes |
| Hosting | Vercel | Deploy automático desde GitHub |
| Emails | Resend | Confirmaciones, campañas, cumpleaños |
| Pagos | Webpay + MercadoPago + Transferencia | Cobro en línea |
| Agente | pg_cron + Supabase Edge Functions | Marketing automático |

---

## Estructura del proyecto

```
sushilareina/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Página principal (carta + checkout)
│   │   ├── admin/page.tsx        ← Dashboard admin (KPIs, pedidos, etc.)
│   │   ├── api/
│   │   │   ├── orders/           ← Crear y consultar pedidos
│   │   │   ├── users/            ← Registro con fechas especiales
│   │   │   ├── analytics/        ← KPIs para el dashboard
│   │   │   ├── admin/            ← Gestión de precios, promos, config
│   │   │   ├── payments/         ← Webhooks Webpay y MercadoPago
│   │   │   └── agent/
│   │   │       ├── reengagement/ ← Campaña clientes inactivos
│   │   │       └── special-dates/← Campañas cumpleaños/aniversarios
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         ← Cliente browser
│   │   │   └── server.ts         ← Cliente servidor + admin
│   │   ├── emails/index.ts       ← Todos los emails con Resend
│   │   └── utils.ts
│   └── types/index.ts
├── supabase/
│   ├── schema.sql                ← Tablas, RLS, funciones, vistas
│   └── seed.sql                  ← Todos los productos de la carta 2026
├── public/
│   └── manifest.json             ← PWA manifest
├── .env.example                  ← Variables de entorno (copiar a .env.local)
├── next.config.js                ← Config Next.js + PWA
├── tailwind.config.ts
└── package.json
```

---

## Deploy paso a paso

### 1. Clonar y preparar
```bash
git clone https://github.com/TU_USUARIO/sushilareina.git
cd sushilareina
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

### 2. Supabase
1. Crea proyecto en supabase.com (región São Paulo)
2. SQL Editor → ejecuta `supabase/schema.sql`
3. SQL Editor → ejecuta `supabase/seed.sql`
4. Copia URL y keys a `.env.local`

### 3. Desarrollo local
```bash
npm run dev
# → http://localhost:3000
```

### 4. GitHub
```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 5. Vercel
1. vercel.com → Import repository
2. Agrega todas las env vars de `.env.example`
3. Deploy automático ✅

---

## Acceso al Panel Admin

- **URL**: `https://sushilareina.cl/admin`
- **Usuario**: `superadmin`
- **Contraseña**: la que configures en `ADMIN_SECRET_KEY`

> El panel es de acceso privado. La URL `/admin` no aparece en ningún lugar del sitio público.

---

## Agente de marketing — Campañas automáticas

El agente ejecuta dos jobs diarios vía pg_cron en Supabase:

| Job | Horario | Qué hace |
|---|---|---|
| `agent-reengagement` | 9:00 AM diario | Detecta clientes sin compra en 30-45 días y envía cupón 10% |
| `agent-special-dates` | 9:00 AM diario | Detecta cumpleaños/aniversarios próximos y envía descuentos |

### Tipos de cupones automáticos

| Fecha | Descuento | Validez |
|---|---|---|
| Cumpleaños | 15% | 7 días |
| Aniversario pololeo | 12% | 5 días |
| Aniversario matrimonio | 15% | 7 días |
| Fecha especial 1 y 2 | 10% | 5 días |
| Re-engagement (inactivo) | 10% | 7 días |

---

## KPIs del Dashboard

- Ventas del día / semana / mes / año
- Ticket promedio (retiro vs delivery)
- Top 10 productos por unidades e ingresos
- Distribución por método de pago
- Clientes activos vs en riesgo
- Tasa de retención y frecuencia de compra
- Heatmap ventas por hora y día de la semana
- Eficiencia del agente de marketing (enviados / convertidos)
- Alertas de productos sin ventas en 14 días

---

## Pagos

| Método | Integración |
|---|---|
| Webpay | transbank-sdk + webhook `/api/payments/webpay/confirm` |
| MercadoPago | mercadopago SDK + webhook `/api/payments/mp/webhook` |
| Transferencia | Manual — admin confirma desde el panel |

---

## Soporte
- WhatsApp: +56 9 7106 1232
- Instagram: @sushilareina_
