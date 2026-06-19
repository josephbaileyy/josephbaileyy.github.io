import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesium' },
        { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesium' },
        { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesium' },
        { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesium' },
      ],
    }),
  ],
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
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/postprocessing/')) return 'postfx';
          if (id.includes('/node_modules/three/')) return 'three';
        },
      },
    },
  },
});
