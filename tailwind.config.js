/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4FA',
          100: '#E1E9F5',
          200: '#C3D3EC',
          300: '#95B3DE',
          400: '#648ECD',
          500: '#3D6FBC',
          600: '#2A559E',
          700: '#1D407C',
          800: '#132C59',
          900: '#0B1F4B', // specified primary navy
          950: '#06112C',
        },
        brand: {
          light: '#E8F1FB', // specified light blue
          DEFAULT: '#3B82F6',
          dark: '#1D4ED8',
        },
        risk: {
          low: '#10B981',    // green
          medium: '#F59E0B', // amber
          high: '#EF4444',   // red
        }
      },
    },
  },
  plugins: [],
}
