import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

function copyFactionData() {
  return {
    name: 'copy-faction-data',
    closeBundle() {
      const src = resolve(frontendRoot, '../data');
      const dest = resolve(frontendRoot, 'dist/data');
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyFactionData()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/pages': 'http://127.0.0.1:8000',
      '/data': 'http://127.0.0.1:8000',
      '/favicon.svg': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
