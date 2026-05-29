/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8f8f8',
          100: '#f0f0f0',
          200: '#e4e4e4',
          300: '#d1d1d1',
          400: '#b4b4b4',
          500: '#9a9a9a',
          600: '#818181',
          700: '#6a6a6a',
          800: '#5a5a5a',
          900: '#1a1a1a',
          950: '#0d0d0d',
        },
        accent: {
          DEFAULT: '#c41e3a',
          hover: '#a01830',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"',
          '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Helvetica Neue"',
          'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      maxWidth: {
        'content': '1200px',
      },
    },
  },
  plugins: [],
};
