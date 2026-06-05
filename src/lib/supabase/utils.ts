// lib/utils.ts
export function formatPrice(amount: number): string {
  return '$' + amount.toLocaleString('es-CL')
}

export function generateCouponCode(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const ts = Date.now().toString(36).slice(-3).toUpperCase()
  return `${prefix}-${random}${ts}`.slice(0, 20)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days} días`
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  fallido: 'Fallido',
  reembolsado: 'Reembolsado',
}
