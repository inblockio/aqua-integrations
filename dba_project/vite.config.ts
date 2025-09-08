import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WebScraper',
      fileName: 'scraper',
      formats: ['es']
    },
    rollupOptions: {
      external: ['cheerio', 'axios', 'fs', 'path', 'url'],
      output: {
        globals: {
          cheerio: 'cheerio',
          axios: 'axios',
          fs: 'fs',
          path: 'path',
          url: 'url'
        }
      }
    },
    outDir: 'dist',
    target: 'node18',
    ssr: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    global: 'globalThis'
  }
});
