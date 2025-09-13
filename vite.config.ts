import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import path from 'node:path';

// Build library from src/index.ts; keep Node deps external
export default defineConfig({
  build: {
    outDir: 'build',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PublicProviderConf',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.cjs'),
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        // Externalize project deps
        'axios', 'commander', 'cheerio', 'toml'
      ],
    },
    sourcemap: true,
    target: 'node18',
    emptyOutDir: false, // do not wipe existing build CLI from tsc
  },
});

