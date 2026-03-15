# Text Fixes Documentation

**Date**: March 15, 2026  
**Author**: AdaL (AI Assistant)

This document details the TypeScript and test configuration fixes applied to the Notifee project.

---

## Issues Encountered & Solutions

### 1. Missing Jest Type Definitions

**Error**: 
```
Cannot find name 'describe'. Do you need to install type definitions for a test runner? 
Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`
```

**Root Cause**: 
- The `@types/jest` package was only installed in `tests_react_native/package.json`
- The root `tsconfig.json` includes files from `packages/react-native/src/**/*.ts` which contain Jest mocks
- TypeScript at the root level couldn't find Jest type definitions

**Solution**:
1. Added `@types/jest` to root `package.json` devDependencies
2. Added `"types": ["jest"]` to `tsconfig.json` compilerOptions to explicitly include Jest types

**Files Modified**:
- `package.json` - Added `"@types/jest": "^29.5.0"` to devDependencies
- `tsconfig.json` - Added `"types": ["jest"]` to compilerOptions

---

### 2. ES6 Library Target Too Old

**Error**:
```
Property 'values' does not exist on type 'ObjectConstructor'. 
Do you need to change your target library? Try changing the 'lib' compiler option to 'es2017' or later.
```

**Root Cause**:
- `tsconfig.json` had `"lib": ["es6"]` which doesn't include `Object.values()`, `Object.entries()`, or `Array.includes()`
- These methods were introduced in ES2017

**Solution**:
Updated `"lib"` from `["es6"]` to `["ES2017"]` in `tsconfig.json`

**Files Modified**:
- `tsconfig.json` - Changed `"lib": ["es6"]` to `"lib": ["ES2017"]`

---

### 3. Missing tslib Module

**Error**:
```
This syntax requires an imported helper but module 'tslib' cannot be found.
```

**Root Cause**:
- `tsconfig.json` has `"importHelpers": true` which instructs TypeScript to import helpers from `tslib` instead of emitting them inline
- The `tslib` package was not installed

**Solution**:
Added `tslib` to root devDependencies: `bun add -d tslib`

**Files Modified**:
- `package.json` - Added `"tslib": "^2.8.1"` to devDependencies

---

### 4. Platform-Specific Test Failures

**Error**:
```
expect(jest.fn()).toHaveBeenNthCalledWith(n, ...expected)
Expected: ["id"]
Received: ["id"], 0, undefined
```

**Root Cause**:
- The default mock platform in `jest-mock.js` is `android` (`Platform.OS: 'android'`)
- The cancel notification tests expected iOS-specific behavior (calling iOS-specific native methods)
- Tests were missing `setPlatform('ios')` calls to switch the platform context

**Solution**:
Added `setPlatform('ios')` calls to the beginning of the 6 failing tests:
- `cancelAllNotifications(ids)`
- `cancelDisplayedNotifications(ids)`
- `cancelTriggerNotifications(ids)`
- `cancelNotification`
- `cancelDisplayedNotification`
- `cancelTriggerNotification`

**Files Modified**:
- `tests_react_native/__tests__/NotifeeApiModule.test.ts` - Added platform setup and renamed tests to include "- iOS" suffix

---

### 5. Module Resolution in Example Project

**Error**:
```
Cannot find module '@psync/notifee' or its corresponding type declarations.ts(2307)
```

**Root Cause**:
- `packages/react-native/example/package.json` specified `@psync/notifee@7.8.2` from npm
- The example project wasn't included in the root workspaces
- Dependencies were outdated compared to the main project

**Solution**:
1. Changed `@psync/notifee` version from `"7.8.2"` to `"workspace:*"` to use local package
2. Added `"packages/react-native/example"` to root workspaces array
3. Updated all dependencies to match main project versions:
   - `react`: `18.2.0` → `^19.0.0`
   - `react-native`: `0.71.17` → `~0.83.2`
   - `@types/jest`: `^26.0.23` → `^29.5.0`
   - `@types/react`: `^18.0.21` → `~19.2.10`
   - `typescript`: `^4.8.3` → `^5.9.3`
   - And other devDependencies
4. Removed the `postinstall` script that referenced yarn (project uses bun)

**Files Modified**:
- `packages/react-native/example/package.json` - Updated dependencies
- `package.json` (root) - Added example to workspaces array

---

## Key Learnings

### 1. Monorepo TypeScript Configuration

In a monorepo setup, the root `tsconfig.json` should account for all TypeScript files across packages. If test-related files (like Jest mocks in `__mocks__` directories) use test framework globals, the types must be available at the root level.

### 2. Workspace Protocol for Local Packages

When referencing a local package within the same monorepo, use the workspace protocol (`"workspace:*"`) instead of version numbers. This ensures:
- The local package is always used during development
- Type definitions resolve correctly
- No need to publish to npm to test changes

### 3. Platform Mocking in React Native Tests

React Native tests that depend on platform-specific code paths must explicitly set the platform context. The `Platform.OS` value is often mocked globally, but individual tests may need to override it using a helper like `setPlatform('ios')` or `setPlatform('android')`.

### 4. TypeScript Lib Target Selection

Choose the `"lib"` compiler option based on the JavaScript features used in the codebase:
- ES6: Basic modern JavaScript (classes, arrow functions, etc.)
- ES2017: Adds `Object.values()`, `Object.entries()`, `Object.getOwnPropertyDescriptors()`
- ES2020: Adds `Promise.allSettled()`, `BigInt`, `globalThis`
- Consider the minimum runtime environment (Node.js version, React Native version)

### 5. Import Helpers and tslib

The `importHelpers` TypeScript option reduces bundle size by importing helper functions from `tslib` instead of inlining them. However, this requires:
- `tslib` to be installed as a dependency
- For libraries, include `tslib` in `peerDependencies` or bundle it

---

## Project Architecture Notes

### Workspace Structure
```
notifee/
├── packages/
│   └── react-native/          # Main library (@psync/notifee)
│       ├── src/               # TypeScript source
│       ├── dist/              # Compiled output
│       ├── android/           # Android native code
│       ├── ios/               # iOS native code
│       └── example/           # Example React Native app
├── tests_react_native/        # Integration test app
├── android/                   # Shared Android core (AAR)
├── ios/                       # Shared iOS core (NotifeeCore)
├── package.json               # Root package (workspaces config)
├── tsconfig.json              # Root TypeScript config
└── lerna.json                 # Lerna monorepo config
```

### Test Frameworks Used
- **Jest**: Unit tests in `tests_react_native/__tests__/`
- **Cavy**: Integration/E2E tests in `tests_react_native/specs/`

### Package Manager
- Uses **Bun** as the primary package manager (`"packageManager": "bun@1.3.10"`)
- Lerna configured with `"npmClient": "bun"`

---

## Verification Commands

After applying fixes, verify with:

```bash
# TypeScript compilation
npx tsc --noEmit

# Run all tests
bun run tests_rn:test

# Full test suite (includes native tests)
bun run test:all

# Install dependencies
bun install
```

---

## Summary of All Changes

| File | Change |
|------|--------|
| `tsconfig.json` | Added `"types": ["jest"]`, changed `"lib"` to `["ES2017"]` |
| `package.json` (root) | Added `@types/jest`, `tslib` to devDependencies; added example to workspaces |
| `tests_react_native/__tests__/NotifeeApiModule.test.ts` | Added `setPlatform('ios')` to 6 tests |
| `packages/react-native/example/package.json` | Updated `@psync/notifee` to `workspace:*`, updated all dependencies |
