/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        mut: 'var(--mut)',
        pink: { DEFAULT: '#ff7a9c', 2: '#ffb0c4', deep: '#d63f69' },
        vio: { DEFAULT: '#8f7cf0', deep: '#5f4ccf' },
        sky: { soft: '#dff0ff' },
        mint: '#d9f7e8',
        cream: '#fff7ec',
        sun: '#ffd36b',
      },
      fontFamily: { sans: ['Nunito', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 16px 34px rgba(143,124,240,.24), inset 0 3px 0 rgba(255,255,255,.9), inset 0 -6px 14px rgba(143,124,240,.08)',
      },
    },
  },
  plugins: [],
}
