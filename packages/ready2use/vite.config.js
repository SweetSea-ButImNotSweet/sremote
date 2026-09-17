import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.js'),
      name: 'SRemoteReady2Use',
      fileName: format => {
        if (format === 'es') return 'index.mjs';
        return 'index.global.js';
      },
      formats: ['es', 'iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: { external: ['@sremote/sdk'], output: { exports: 'named', globals: { '@sremote/sdk': 'SRemoteSDK' } } },
  },
});
