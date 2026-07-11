/**
 * Config de Tailwind compilado en el build (antes: cdn.tailwindcss.com en runtime).
 * Los colores son EXACTAMENTE los del tailwind.config inline que vivía en index.html.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escala completa: el config viejo solo tenía DEFAULT/hover/light, así
        // que primary-50..900 (25 usos en el código) nunca generaron color —
        // ni siquiera con el CDN. Alineada a la familia blue de Tailwind.
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          DEFAULT: '#1E40AF',
          hover: '#1D4ED8',
          light: '#3B82F6',
        },
        secondary: '#9333EA',
        dark: {
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
        },
        light: {
          background: '#F9FAFB',
          surface: '#FFFFFF',
          text: '#111827',
          subtext: '#6B7280',
          border: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};
