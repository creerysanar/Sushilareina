// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sushi La Reina — Fusión Japonesa en La Reina',
  description: 'Rolls, Nikkei, Ceviches y mucho más. Retiro y delivery en La Reina y comunas vecinas. Lynch Sur #17, La Reina, Santiago.',
  keywords: 'sushi, la reina, delivery, rolls, nikkei, ceviches, Santiago',
  authors: [{ name: 'Sushi La Reina' }],
  openGraph: {
    title: 'Sushi La Reina',
    description: 'Fusión japonesa en La Reina. Retiro y delivery.',
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
