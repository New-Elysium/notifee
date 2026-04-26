# Notifee Project Overview

## Purpose
Notifee is a feature-rich notifications library for React Native, supporting Android and iOS. The published npm package is `@psync/notifee` (v9.3.0).

## Tech Stack
- **TypeScript** (strict mode) for the JS/TS layer
- **Java** (targeting Java 17, toolchain Java 21) for Android native
- **Objective-C/C++** for iOS native
- **Bun** (1.3.10) as package manager
- **Lerna** for monorepo management
- **Jest** for unit testing
- **Cavy** for E2E testing
- **ESLint + Prettier** for code quality
- **google-java-format** for Android Java
- **clang-format** (Google style) for iOS Obj-C/C++

## Structure
```
notifee/
├── android/                    # Core Android native (Java)
├── ios/                        # Core iOS native (Obj-C/C++)
├── packages/react-native/      # Main RN package (@psync/notifee)
│   └── example/                # Example app
├── tests_react_native/         # E2E test suite
├── docs/                       # TypeDoc docs
└── .github/workflows/          # CI/CD
```

## Key Dependencies
- React 19.2+, React Native 0.83+, Scheduler 0.25+
- Expo config plugins support
