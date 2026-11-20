import localFont from 'next/font/local';

// Lanza: la letra de la interfaz es Instrument Sans (variable 400-700).
// Se conserva el nombre de la exportacion para no tocar los layouts de Postiz.
export const jakartaSans = localFont({
  src: [
    {
      path: '../instrument-sans/instrument-sans-latin.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: './PlusJakartaSans-Italic.woff2',
      weight: '500 700',
      style: 'italic',
    },
  ],
  fallback: ['system-ui', 'sans-serif'],
});
