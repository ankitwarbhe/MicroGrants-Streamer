import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: {},
    'process.version': '"v18.0.0"',
    'process.env': {
      NODE_DEBUG: false,
    },
  },
  resolve: {
    alias: {
      process: 'process/browser',
      buffer: 'buffer',
      util: 'util',
      stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
      crypto: path.resolve(__dirname, 'node_modules/crypto-browserify'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'buffer',
      'process/browser',
      'util',
      'stream-browserify',
      'crypto-browserify',
    ],
  },
  server: {
    port: 3000,
    strictPort: true
  }
});
