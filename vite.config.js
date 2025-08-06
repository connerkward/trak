import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        settings: resolve(__dirname, 'src/settings.html')
      }
    },
    // Optimize for Electron
    minify: mode === 'production',
    sourcemap: mode === 'development' ? 'inline' : false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000
  },
  base: './', // Relative paths for file:// protocol
  server: {
    port: 5173,
    strictPort: true,
    // Prevent CORS issues in development
    cors: true
  },
  // Optimize dependencies for Electron
  optimizeDeps: {
    exclude: ['electron']
  },
  define: {
    // Expose environment info to renderer
    __DEV__: mode === 'development'
  }
}));