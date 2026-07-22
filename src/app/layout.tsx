import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sushi La Reina — Fusión Japonesa en La Reina, Santiago',
  description: 'El mejor sushi de La Reina. Rolls, Nikkei, Ceviches y más. Retiro en local y delivery a La Reina, Peñalolén, Macul y comunas vecinas. Lynch Sur #17, La Reina, Santiago.',
  keywords: 'sushi la reina, sushi delivery la reina, sushi santiago, rolls la reina, nikkei santiago, sushi peñalolén, sushi macul, delivery sushi santiago, sushi fusion santiago',
  authors: [{ name: 'Sushi La Reina' }],
  openGraph: {
    title: 'Sushi La Reina — Fusión Japonesa en La Reina',
    description: 'Rolls, Nikkei, Ceviches y más. Retiro y delivery en La Reina y comunas vecinas.',
    url: 'https://sushilareina.cl',
    siteName: 'Sushi La Reina',
    locale: 'es_CL',
    type: 'website',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#C8001C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
