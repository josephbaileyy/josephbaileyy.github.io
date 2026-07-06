import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  root: 'worldline',
  base: './',
  plugins: mode === 'artifact' ? [viteSingleFile()] : [],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
