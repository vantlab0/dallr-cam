import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { decartTokenPlugin } from './vite/decart-token-plugin';

export default defineConfig(({ mode }) => {
  // Load non-VITE variables for the dev-only token endpoint. `DECART_API_KEY`
  // stays in the Node process and is never included in the client bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), decartTokenPlugin({ apiKey: env.DECART_API_KEY })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    optimizeDeps: {
      include: ['@decartai/sdk'],
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      // The WebRTC/LiveKit chunk is loaded only when a session starts.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Keep the framework, animation and icon libraries in separate chunks.
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'motion-vendor': ['framer-motion'],
            'icon-vendor': ['lucide-react'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
