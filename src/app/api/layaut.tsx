import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sushi La Reina',
  description: 'Fusión japonesa en La Reina. Retiro y delivery.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
