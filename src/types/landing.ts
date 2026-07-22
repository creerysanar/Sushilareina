// ============================================================
// SUSHI LA REINA — Landing Block System Types
// ============================================================

export type BlockType =
  | 'hero'
  | 'menu'
  | 'promos'
  | 'historia'
  | 'beneficios'
  | 'testimonios'
  | 'faq'
  | 'cobertura'
  | 'blog'
  | 'cta'
  | 'footer'

export interface LandingBlock {
  id: string
  type: BlockType
  active: boolean
  sort_order: number
  data: Record<string, any>
}

// ── Datos por tipo de bloque ──────────────────────────────────

export interface HeroData {
  badge: string
  title: string
  subtitle: string
  description: string
  cta_primary_label: string
  cta_secondary_label: string
  cta_secondary_url: string
  bg_gradient: string
}

export interface HistoriaData {
  eyebrow: string
  title: string
  paragraphs: string[]
  image_url: string
  founded_year: string
  stats: { label: string; value: string }[]
}

export interface BeneficiosData {
  eyebrow: string
  title: string
  items: { icon: string; title: string; description: string }[]
}

export interface TestimoniosData {
  eyebrow: string
  title: string
  items: { name: string; text: string; rating: number; date: string }[]
}

export interface FaqData {
  eyebrow: string
  title: string
  items: { question: string; answer: string }[]
}

export interface CoberturaData {
  eyebrow: string
  title: string
  description: string
  communes: { name: string; cost: number; eta: string }[]
  pickup_address: string
  pickup_note: string
}

export interface BlogData {
  eyebrow: string
  title: string
  posts: {
    slug: string
    title: string
    excerpt: string
    date: string
    tag: string
    image_url: string
  }[]
}

export interface CtaData {
  eyebrow: string
  title: string
  description: string
  cta_label: string
  cta_url: string
  secondary_label: string
  secondary_url: string
  bg_color: string
}

export interface FooterData {
  brand: string
  tagline: string
  address: string
  maps_url: string
  phone: string
  website: string
  instagram: string
  facebook: string
  schedule: { label: string; hours: string }[]
  legal: string
}
