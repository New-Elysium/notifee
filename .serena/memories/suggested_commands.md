# Suggested Commands

## Install
```bash
bun install
```

## Build
```bash
bun run build:core          # Build Android & iOS core
bun run build:rn            # Build React Native package
bun run build:all           # Build everything
```

## Test
```bash
bun run test:all            # All tests
bun run test:core:android   # Android unit tests
bun run tests_rn:test       # Jest tests
```

## Format & Lint
```bash
bun run format:all          # Format all
bun run format:all:check    # Check formatting
bun run validate:all        # ESLint + TSC
```

## Pre-commit
```bash
bun run precommit           # Full pre-commit checks
```
