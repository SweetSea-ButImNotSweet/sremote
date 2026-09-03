import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.js'),
      name: 'SRemoteWrapper',
      fileName: format => {
        if (format === 'es') return 'index.mjs';
        if (format === 'cjs') return 'index.cjs';
        return 'index.global.js';
      },
      formats: ['es', 'cjs', 'iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { output: { exports: 'named' } },
  },
});
