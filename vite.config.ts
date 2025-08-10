import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const copyStaticAssets = () => ({
  name: 'copy-static-assets',
  writeBundle() {
    const distDir = resolve(__dirname, 'dist');

    const iconsDir = resolve(distDir, 'icons');
    if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

    ['icon16.png', 'icon48.png', 'icon128.png'].forEach(file => {
      const src = resolve(__dirname, 'src/icons', file);
      const dest = resolve(iconsDir, file);
      if (existsSync(src)) copyFileSync(src, dest);
    });

    ['en', 'he'].forEach(locale => {
      const localeDir = resolve(distDir, '_locales', locale);
      if (!existsSync(localeDir)) mkdirSync(localeDir, { recursive: true });

      const src = resolve(__dirname, 'src/_locales', locale, 'messages.json');
      const dest = resolve(localeDir, 'messages.json');
      if (existsSync(src)) copyFileSync(src, dest);
    });
  },
});

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    webExtension({
      manifest: resolve(__dirname, 'src/manifest.json'),
      browser: 'chrome',
    }),
    copyStaticAssets(),
  ],
});
