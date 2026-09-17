import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.js'),
      name: 'SRemoteSDK',
      fileName: format => {
        if (format === 'es') return 'index.mjs';
        return 'index.global.js';
      },
      formats: ['es', 'iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: { output: { exports: 'named' } },
  },
});
