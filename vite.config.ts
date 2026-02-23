import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/games/cube-runner/',
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@levels': resolve(__dirname, 'src/levels'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@game-types': resolve(__dirname, 'src/types'),
      '@game': resolve(__dirname, 'src/game'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
