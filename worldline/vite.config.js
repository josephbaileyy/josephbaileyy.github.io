import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const worldlineRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: worldlineRoot,
  base: './',
  plugins: mode === 'artifact' ? [viteSingleFile()] : [],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
  },
  build: {
    // Builds ship no source maps: production was serving ~2.9 MB of them, and
    // `mode !== 'production'` still emitted one for the single-file artifact
    // build. The dev server provides its own maps regardless of this option,
    // so only an explicit development build opts back in.
    sourcemap: mode === 'development',
    assetsInlineLimit: mode === 'artifact' ? 1024 * 1024 : 4096,
    outDir: resolve(worldlineRoot, 'dist'),
    emptyOutDir: true,
  },
}));
