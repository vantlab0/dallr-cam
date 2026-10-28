import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { decartTokenPlugin } from './vite/decart-token-plugin';

function decartWorkerPlugin(): Plugin {
  return {
    name: 'decart-worker-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes('frame-metadata-worker.js')) {
          const workerPath = path.resolve(
            process.cwd(),
            'node_modules/@decartai/sdk/dist/realtime/browser/frame-metadata-worker.js',
          );
          if (fs.existsSync(workerPath)) {
            res.setHeader('Content-Type', 'text/javascript');
            res.end(fs.readFileSync(workerPath));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load non-VITE variables for the dev-only token endpoint. `DECART_API_KEY`
  // stays in the Node process and is never included in the client bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [react(), decartTokenPlugin({ apiKey: env.DECART_API_KEY }), decartWorkerPlugin()],
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
