import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    threads: false,
    include: [
      'tests/**/*.spec.ts',
      'src/**/*.{spec,test}.ts',
    ],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
