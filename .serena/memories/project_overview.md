# Notifee Project Overview

## Purpose
Notifee is a feature-rich notifications library for React Native, supporting Android and iOS. The published npm package is `@psync/notifee` (v9.5.2). Repo: `github.com/New-Elysium/notifee`.

## Tech Stack
- **TypeScript** ^6.0 (strict mode) for the JS/TS layer
- **Java** (compile target Java 17, toolchain Java 21) for Android native
- **Objective-C/C++** for iOS native
- **Bun** (1.3.10) as package manager (`packageManager: bun@1.3.10`)
- **@lerna-lite** + Bun workspaces for monorepo management
- **Jest** 30 for unit testing, **Cavy** for E2E testing
- **ESLint** 10 + **Prettier** for code quality
- **google-java-format** for Android Java, **clang-format** (Google style) for iOS
- **TypeDoc** for API reference generation (`gen:reference`)
- **semantic-release** for automated npm publishing (Publish workflow)

## Structure
```
notifee/
├── android/                    # Core Android native (Java)
├── ios/                        # Core iOS native (Obj-C/C++)
├── packages/react-native/      # Main RN package (@psync/notifee)
│   └── example/                # Example app
├── tests_react_native/         # E2E test suite (workspace)
├── docs/                       # TypeDoc docs
└── .github/workflows/          # CI/CD
```

## Key Facts
- Workspaces: `packages/*`, `tests_react_native`
- RN codegen: `NotifeeSpec` (modules), Android package `io.invertase.notifee`, jsSrcsDir `src/specs`
- Package build generates `src/version.ts` via genversion, then `tsc` (main: `dist/index.js`)
- Expo config plugins support (`@expo/config-plugins`, `app.plugin.js`, `plugin/`)
- Root deps include axios + shelljs (build tooling)

## Peer Dependencies (published package)
- `react >=19.2.4`
- `react-native >=0.83.2`
- `scheduler >=0.25.0` (root resolution pinned to 0.25.0)

## Publishing
- Package name `@psync/notifee`, public access
- Token from env `NPM_ACCESS_TOKEN` (used in `.npmrc` and `bunfig.toml`)
- CI: semantic-release via `.github/workflows/publish.yml` (secret `NPM_ACCESS_TOKEN`)
- Requires Conventional Commits for versioning
