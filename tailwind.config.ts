// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rojo:  '#C8001C',
        dorado:'#D4A017',
        negro: '#0A0A0A',
        crema: '#FDF6E3',
      },
      fontFamily: {
        serif: ['Noto Serif Display', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up':   'fadeUp .5s ease both',
        'page-flip': 'pageFlip .4s ease both',
        'shimmer':   'shimmer 1.4s infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pageFlip: {
          from: { opacity: '0', transform: 'rotateY(-6deg) translateX(-16px)' },
          to:   { opacity: '1', transform: 'rotateY(0) translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
