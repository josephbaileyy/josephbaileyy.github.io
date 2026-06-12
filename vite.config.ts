import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  resolve: {
    // postprocessing + app must share one three instance
    dedupe: ['three'],
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about.html',
      },
    },
  },
});
