import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, chmodSync } from 'fs'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@modelcontextprotocol/sdk']
      }),
      {
        name: 'copy-manifest',
        closeBundle() {
          copyFileSync(
            resolve(__dirname, 'src/main/manifest.json'),
            resolve(__dirname, 'out/main/manifest.json')
          )
        }
      },
      {
        name: 'make-mcp-server-executable',
        closeBundle() {
          const mcpServerPath = resolve(__dirname, 'out/main/mcp-server.js');
          try {
            chmodSync(mcpServerPath, '755');
          } catch (error) {
            console.warn('Failed to make mcp-server.js executable:', error);
          }
        }
      }
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'mcp-server': resolve(__dirname, 'src/main/mcp-server.ts')
        },
        output: {
          manualChunks: undefined,
          banner: (chunk) => {
            if (chunk.name === 'mcp-server') {
              return '#!/usr/bin/env node\n';
            }
            return '';
          }
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: './src/renderer',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/main/index.html'),
          settings: resolve(__dirname, 'src/renderer/settings/index.html')
        }
      }
    }
  }
})