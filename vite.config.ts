import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    /**
     * Deploying to a GitHub Pages *project* page (e.g.
     * https://<user>.github.io/Home-Page/) requires a matching base, otherwise
     * every /assets/* URL 404s. Override without editing this file:
     *
     *   VITE_BASE=/Home-Page/ npm run build
     *
     * Defaults to '/' for root-domain and local development.
     */
    base: env.VITE_BASE || '/',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // The single chunk crossed the 500 kB warning threshold. Splitting React
      // and the (now lazily loaded) lunar library keeps the entry chunk small
      // and makes the warning meaningful again.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
