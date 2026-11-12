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
          DEFAULT: '#0B0B0C',
          900: '#000000',
          800: '#0B0B0C',
          700: '#2A2D31',
          600: '#3A3A3D',
        },
        dourado: {
          DEFAULT: '#75757A',
          claro: '#B9B9BD',
          escuro: '#4A4A4E',
        },
        grafite: {
          DEFAULT: '#2A2D31',
          claro: '#5F6166',
        },
        pergaminho: '#F5F5F6',
        // Tons de estado com contraste suficiente sobre fundo claro (WCAG AA)
        atencao: '#8A5A00',
        atencaoFundo: '#FDF6E3',
        critico: '#A32020',
        criticoFundo: '#FBEAEA',
        regular: '#1E6B45',
        regularFundo: '#EAF5EF',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
