// ============================================================
// SUSHI LA REINA — TypeScript Types
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  birth_date: string | null
  anniversary_date: string | null
  wedding_date: string | null
  special_date_1: string | null
  special_date_1_label: string | null
  special_date_2: string | null
  special_date_2_label: string | null
  favorite_category: string | null
  marketing_consent: boolean
  push_token: string | null
  created_at: string
  last_order_at: string | null
  total_orders: number
  total_spent: number
}

export interface Category {
  id: number
  slug: string
  name: string
  description: string | null
  sort_order: number
  active: boolean
}

export interface Product {
  id: string
  category_id: number
  name: string
  description: string | null
  price: number
  price_old: number | null
  image_url: string | null
  portions: string | null
  badge: string | null
  active: boolean
  featured: boolean
  sort_order: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export type OrderType = 'retiro' | 'delivery'
export type PaymentMethod = 'webpay' | 'mercadopago' | 'transferencia'
export type OrderStatus = 'nuevo' | 'confirmado' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'cancelado'
export type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado'

export interface Order {
  id: string
  order_number: number
  user_id: string | null
  customer_name: string
  customer_phone: string
  customer_email: string | null
  order_type: OrderType
  delivery_address: string | null
  commune: string | null
  subtotal: number
  delivery_cost: number
  discount: number
  coupon_code: string | null
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_ref: string | null
  status: OrderStatus
  created_at: string
  confirmed_at: string | null
  ready_at: string | null
  delivered_at: string | null
  notes: string | null
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order: number
  max_uses: number | null
  uses_count: number
  user_id: string | null
  valid_from: string
  valid_until: string | null
  active: boolean
}

export interface DeliveryCommune {
  name: string
  cost: number
}

export interface PaymentConfig {
  bank_name: string
  account_type: string
  account_number: string
  rut: string
  owner_name: string
  email: string
}

// Analytics types
export interface DailySales {
  day: string
  order_count: number
  revenue: number
  avg_ticket: number
  delivery_count: number
  pickup_count: number
}

export interface TopProduct {
  product_name: string
  units_sold: number
  revenue: number
  order_appearances: number
}

export interface MonthlyKPIs {
  total_orders: number
  total_revenue: number
  avg_ticket: number
  unique_customers: number
  delivery_ratio: number
  webpay_count: number
  mp_count: number
  transfer_count: number
}

export interface AtRiskCustomer {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  last_order_at: string
  total_orders: number
  total_spent: number
  days_since_last_order: number
}

// Campaign types
export type CampaignType =
  | 'reengagement'
  | 'birthday'
  | 'anniversary'
  | 'wedding'
  | 'special_date'
  | 'slow_product'
  | 'top_customer'

export interface Campaign {
  id: string
  type: CampaignType
  user_id: string
  coupon_id: string | null
  channel: 'email' | 'push' | 'whatsapp'
  subject: string | null
  sent_at: string
  opened_at: string | null
  clicked_at: string | null
  converted_at: string | null
  order_id: string | null
}
