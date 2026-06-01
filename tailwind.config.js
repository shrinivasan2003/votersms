/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1B3A6B',
          blue: '#2563EB',
          bg: '#F5F7FA',
          card: '#FFFFFF',
          border: '#E5E7EB',
          textPrimary: '#1F2937',
          textSecondary: '#6B7280',
          textMuted: '#9CA3AF',
          sidebarActiveBg: '#EFF6FF',
          sidebarActiveBorder: '#2563EB',
        },
        iconBox: {
          counties: '#3B82F6',
          precincts: '#10B981',
          voters: '#8B5CF6',
          smsTemplates: '#F59E0B',
          smsJobs: '#6366F1',
          activeUsers: '#EC4899'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0)    scale(1)'    },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'   },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':  'fade-in  0.4s ease forwards',
      },
    },
  },
  plugins: [],
}
