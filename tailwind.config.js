/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDFCF6', // paper beige base
          100: '#F8F7F0',
          200: '#EAE5D9',
          300: '#DABBA1',
          400: '#D17F38', // Clear Amber (Light Mode Primary)
          500: '#C88D5A', // Warm Amber (Dark Mode Primary)
          600: '#B07545',
          700: '#8A5A35',
          800: '#664228',
          900: '#452C1C',
          950: '#2A1A10',
        },
        zinc: {
          50: '#FDFCF6', // Light mode base background
          100: '#E6E2D8', // Paper white for dark mode primary text
          200: '#D1CEC7',
          300: '#B4B0A9',
          400: '#8A857D',
          500: '#66615B',
          600: '#4A4643',
          700: '#35322F', // dark elevated
          800: '#2A2826', // dark surface
          900: '#1F1D1B', // dark base background
          950: '#11100F',
        },
        gray: {
          // Overriding gray for light mode text and subtle elements
          50: '#FDFCF6',  // bg-gray-50 -> paper white
          100: '#F5F4EE',
          200: '#EAE5D9',
          300: '#D6D1C4',
          400: '#A39D93',
          500: '#7A756C',
          600: '#5C5851',
          700: '#403C37',
          800: '#222222', // Light mode primary text
          900: '#1A1A1A', // Light mode headings text
        }
      },
      fontFamily: {
        sans: ['"LXGW WenKai"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'warm': '0 8px 30px -4px rgba(0, 0, 0, 0.4)',
        'warm-sm': '0 4px 15px -2px rgba(0, 0, 0, 0.3)',
        'diffuse': '0 10px 40px -10px rgba(0, 0, 0, 0.5)', // Large, diffuse shadow for dark modals
        'diffuse-light': '0 12px 40px -10px rgba(0, 0, 0, 0.08), 0 4px 12px -5px rgba(0, 0, 0, 0.04)', // Diffuse shadow for light modals/cards
        'diffuse-sm': '0 4px 20px -5px rgba(0, 0, 0, 0.4)', // Smaller diffuse shadow for dark cards
        'diffuse-sm-light': '0 4px 20px -5px rgba(0, 0, 0, 0.06)', // Smaller diffuse for light mode cards
        'focus-glow': '0 0 15px rgba(200, 141, 90, 0.2)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 250, 240, 0.04)',
      },
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'zoom-in': 'zoomIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}