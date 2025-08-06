import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react({
    fastRefresh: true
  })],
  root: './landing-page',
  base: process.env.NODE_ENV === 'production' ? '/trak/' : '/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'landing-page/index.html')
      }
    },
    assetsDir: 'assets'
  },
  server: {
    port: 5174,
    open: true,
    hmr: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'landing-page/src')
    }
  },
  publicDir: ['landing-page/public', 'assets']
}); 