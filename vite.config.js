import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    crx({ manifest }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  build: {
    // Transformer.js and LangChain optimizations
    target: 'esnext',
    rollupOptions: {
      output: {
        // Required for transformers.js
        format: 'es',
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    }
  },
  envPrefix: ['VITE_', 'GROQ_']
});
