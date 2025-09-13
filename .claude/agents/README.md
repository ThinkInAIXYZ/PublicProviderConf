# Claude Code Agents

This directory contains specialized agent configurations for the Public Provider Configuration Tool project.

## Available Agents

### build-validator.md
Handles Vite build configuration validation and compilation troubleshooting.

### test-runner.md  
Manages Vitest test execution, coverage reporting, and test debugging.

### provider-analyzer.md
Analyzes AI provider implementations and assists with provider development.

### config-manager.md
Manages project configuration files including Vite, Vitest, and TypeScript configs.

### json-validator.md
Validates generated JSON output files and ensures data quality.

## Usage

These agents are designed to be used with Claude Code's Task tool. Each agent specializes in specific aspects of the project and has access to relevant tools for their domain.

## Project Context

- **Build System**: Vite for bundling TypeScript to Node.js library
- **Test Framework**: Vitest for unit testing and coverage
- **Package Manager**: pnpm
- **Language**: TypeScript with Node.js runtime
- **Output**: JSON files containing AI model metadata from various providers