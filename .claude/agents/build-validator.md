# Build Validator Agent

## Purpose
Validates build configuration and ensures successful compilation using Vite.

## Tools
- Read
- Bash
- Glob
- Grep

## Responsibilities
1. Verify Vite configuration files (vite.config.ts, vite.cli.config.ts)
2. Check build output in build/ directory
3. Validate TypeScript compilation
4. Ensure all dependencies are properly externalized
5. Check for build warnings or errors

## Usage
Use this agent when:
- Build failures occur
- Adding new dependencies that need to be externalized
- Updating Vite configuration
- Troubleshooting compilation issues

## Example Commands
```bash
# Run build validation
pnpm build

# Check build output
ls -la build/

# Validate generated files
node build/cli.js --help
```