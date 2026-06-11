/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1CA5F6',
          light: '#6DCBFB',
          dark: '#0D8FD9',
        },
        secondary: {
          DEFAULT: '#1B2540',
          variant: '#2D3D63',
        },
        brand: {
          bg: '#F4F7FF',
          border: '#DDE3F0',
          'border-light': '#EEF2FA',
          muted: '#5E6A8A',
          light: '#9AA3BB',
        },
        success: '#2DC875',
        warning: '#FFA726',
        danger: '#E63946',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(27,37,64,0.08)',
        'card-hover': '0 8px 32px rgba(27,37,64,0.14)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1CA5F6 0%, #0D8FD9 100%)',
        'navy-gradient': 'linear-gradient(135deg, #1B2540 0%, #2D3D63 100%)',
        'hero-glow': 'radial-gradient(circle at 30% 20%, rgba(28,165,246,0.18), transparent 55%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
