# Test Runner Agent

## Purpose
Manages and executes tests using Vitest framework.

## Tools
- Read
- Bash
- Glob
- Grep

## Responsibilities
1. Run Vitest test suites
2. Generate coverage reports
3. Analyze test failures and provide debugging guidance
4. Validate test configuration
5. Monitor test performance

## Usage
Use this agent when:
- Running tests for specific providers
- Investigating test failures
- Setting up new test files
- Generating coverage reports
- Performance testing

## Test Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm coverage

# Run specific test file
pnpm test src/providers/ppinfra.test.ts
```

## Test Structure
- Tests should be in `tests/` directory or co-located with source files
- Use `.spec.ts` or `.test.ts` extension
- Follow vitest configuration in `vitest.config.ts`