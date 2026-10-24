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
          DEFAULT: '#14213D',
          900: '#0B1526',
          800: '#14213D',
          700: '#1F3157',
          600: '#2C4474',
        },
        dourado: {
          DEFAULT: '#B08D57',
          claro: '#C9A878',
          escuro: '#8A6D40',
        },
        grafite: {
          DEFAULT: '#3A3F47',
          claro: '#5A6372',
        },
        pergaminho: '#FAF8F5',
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
