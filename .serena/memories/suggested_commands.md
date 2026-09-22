# Suggested Commands (Post-Restructure)

## Install
```bash
bun install
```

## Build
```bash
bun run build              # Build everything (RN package + core Android/iOS)
bun run build:rn           # Build React Native package (genversion + tsc)
bun run build:rn:watch     # Watch-mode build of the RN package
bun run build:core         # Build core libraries (Android + iOS)
bun run build:core:android # Gradle build of android/ (publishes AAR into RN package)
bun run build:core:ios     # Copy NotifeeCore pod into packages/react-native/ios
bun run clean              # Remove all build artifacts
```

## Quality
```bash
bun run lint               # ESLint
bun run lint:fix           # ESLint with auto-fix
bun run typecheck          # TypeScript project check
bun run format             # Format Java (google-java-format) + Obj-C/C++ (clang-format)
bun run format:check       # Check-only formatting
bun run docs               # TypeDoc API reference generation
bun run precommit          # clean + build + docs + lint + typecheck + format:check + test + test:android
```

## Test
```bash
bun run test               # Jest unit tests (tests_react_native)
bun run test:watch         # Jest watch mode
bun run test:coverage      # Jest with coverage
bun run test:android       # Android JUnit tests (gradlew testDebugUnit)
```

## E2E (Cavy suite in `tests_react_native/`)
```bash
bun run e2e:start          # Metro bundler for E2E app
bun run e2e:pods           # pod install for E2E app
bun run e2e:build:android  # Assemble E2E debug app
bun run e2e:android        # Run E2E suite on Android
bun run e2e:ios            # Run E2E suite on iOS (iPhone 17 sim default)
```

## Smoke Test App (`example/`, npm-managed outside Bun workspace)
```bash
bun run smoke:setup        # One-time setup: build RN package, then npm install + pod install
bun run smoke:ios          # Launch smoke test app on iOS simulator (iPhone 17 default)
bun run smoke:android      # Launch smoke test app on Android emulator
bun run smoke:start        # Metro bundler for smoke test app
bun run smoke:pods         # Re-run pod install for smoke test app
```

## React Native Package Scripts (`packages/react-native/`)
```bash
bun run build              # Build TypeScript to dist/
bun run build:watch        # Build with watch mode
bun run build:clean        # Remove build artifacts
bun run format:android     # Format Java code (google-java-format)
bun run format:ios         # Format Objective-C/C++ code (clang-format)
```

## Environment
- Android SDK: `/Volumes/XCode/Android/sdk` (pinned in example/android/local.properties)
- iOS Simulator: defaults to `iPhone 17` (override with `IOS_SIMULATOR`)
- Java: JDK 21 at `/usr/local/Cellar/openjdk@21/21.0.10/libexec/openjdk.jdk/Contents/Home`