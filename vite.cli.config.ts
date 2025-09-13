import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import path from 'node:path';

// Build the CLI entry to build/cli.js (CJS) with a shebang
export default defineConfig({
  build: {
    outDir: 'build',
    lib: {
      entry: path.resolve(__dirname, 'src/cli.ts'),
      formats: ['cjs'],
      fileName: () => 'cli',
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        'commander',
        // also externalize project internals imported by cli
        /^(\.\.\/|\.\/|public-provider-conf)/,
      ],
      output: {
        entryFileNames: 'cli.js',
      },
    },
    sourcemap: true,
    target: 'node18',
    emptyOutDir: false,
  },
});
