/**
 * 从 dmusic-core 构建可加载的 MV3 解压目录到 dist/（替代整树 sync）。
 *
 * @author dmusic-chrome
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.resolve(__dirname, '../dmusic-core');

function copyMv3Shell() {
  return {
    name: 'copy-mv3-shell',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      for (const f of ['manifest.json', 'background.js', 'dnr_bilibili_cdn.json']) {
        const from = path.join(__dirname, f);
        const to = path.join(dist, f);
        if (!fs.existsSync(from)) {
          console.warn('copy-mv3-shell: missing', from);
          continue;
        }
        fs.copyFileSync(from, to);
      }
    },
  };
}

export default defineConfig({
  root: __dirname,
  base: './',
  publicDir: false,
  resolve: {
    alias: {
      '@core': CORE,
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'player.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      treeshake: false,
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.join('..', 'dmusic-core', 'user-sources', '*'),
          dest: 'user-sources',
        },
        { src: path.join('..', 'dmusic-core', 'docs', '**', '*'), dest: 'docs' },
      ],
    }),
    copyMv3Shell(),
  ],
});
