import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react({
    fastRefresh: true
  })],
  root: '.',
  base: process.env.NODE_ENV === 'production' ? '/trak/' : '/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy-policy.html'),
        terms: resolve(__dirname, 'terms-of-service.html')
      }
    }
  },
  server: {
    port: 5174,
    open: true,
    hmr: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  publicDir: 'public'
}); 