import { readFileSync } from 'node:fs';
import playgamaBridge from '@playgama/bridge/vite';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  // Adds the Playgama Bridge <script> to index.html. It is the only resource loaded from outside the build.
  plugins: [playgamaBridge()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
  test: { include: ['tests/**/*.test.ts'] },
});
