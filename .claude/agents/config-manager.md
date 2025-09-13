# Configuration Manager Agent

## Purpose
Manages project configuration files and build settings.

## Tools
- Read
- Edit
- Write
- Bash

## Responsibilities
1. Manage Vite build configurations
2. Update Vitest test configurations
3. Handle TypeScript configuration
4. Manage package.json scripts and dependencies
5. Configure environment variables and API keys

## Configuration Files
- `vite.config.ts` - Main library build configuration
- `vite.cli.config.ts` - CLI build configuration (if exists)
- `vitest.config.ts` - Test runner configuration
- `tsconfig.json` - TypeScript compiler options
- `package.json` - Project metadata and scripts

## Usage
Use this agent when:
- Updating build configurations
- Adding new dependencies
- Modifying test settings
- Setting up environment variables
- Troubleshooting configuration issues

## Key Configuration Patterns
```typescript
// Vite config for Node.js library
export default defineConfig({
  build: {
    outDir: 'build',
    lib: { entry: 'src/index.ts' },
    rollupOptions: {
      external: ['axios', 'commander', 'cheerio', 'toml']
    }
  }
});

// Vitest config for testing
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'src/**/*.test.ts']
  }
});
```