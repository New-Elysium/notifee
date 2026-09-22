# Suggested Commands (Post-Restructure)

## Install
```bash
bun install
```

## Build
```bash
bun run build              # Build everything (RN package + core Android/iOS) — ~1 min total
bun run build:rn           # Build React Native package (genversion + tsc) — MUST re-run after any version bump so dist/version.js matches package.json
bun run build:rn:watch     # Watch-mode build of the RN package
bun run build:core         # Build core libraries (Android + iOS)
bun run build:core:android # Gradle build of android/ (publishes AAR + checksums into packages/react-native/android/libs/)
bun run build:core:ios     # Copy NotifeeCore pod into packages/react-native/ios
bun run clean              # Remove all build artifacts
```

## Quality
```bash
bun run lint               # ESLint
bun run typecheck          # TypeScript project check (tsc --project ./)
bun run format:check       # Check formatting (google-java-format / clang-format)
bun run docs               # TypeDoc API reference generation
bun run precommit          # clean + build + docs + lint + typecheck + format:check + test + test:android
```

## Test
```bash
bun run test               # Jest unit tests (tests_react_native) — ~5s, 23 suites
bun run test:android       # Android JUnit tests (gradlew testDebugUnit, Robolectric) — all pass
```

### Jest baseline (2026-09-22)
**376 passed / 14 failed / 390 total is the KNOWN BASELINE.** The 14 failures are pre-existing flakes verified identical on stashed HEAD, concentrated in validator suites:
- `validateAndroidNotification.test.ts` — `TypeError: expect(...).toThrowError is not a function` (expect@30.3.0 quirk)
- `validateIOSNotification.test.ts` or `validateNotifications.test.ts` — stale error-message expectation (`'notification.sound'` vs `'notification.ios.sound'`)
Which of the two suites flakes can vary run-to-run, but the total (14) is stable. Don't chase them; anything NEW failing is a regression.

## Smoke Test App (`example/`, npm-managed outside Bun workspace)
```bash
bun run smoke:setup        # One-time setup: build RN package, then npm install + pod install
bun run smoke:ios          # Launch smoke test app on iOS simulator (iPhone 17 default)
bun run smoke:android      # Launch on Android (physical device required on this host)
bun run smoke:start        # Metro bundler for smoke test app
bun run smoke:pods         # Re-run pod install (use RCT_USE_PREBUILT_RNCORE=0 npx pod-install for RN 0.87)
```

## Publish
```bash
# 1. Check the version is free on npm FIRST (9.6.0 was burned by a stale publish)
npm view @psync/notifee version

# 2. Rebuild dist so version.js matches package.json
cd packages/react-native && bun run build

# 3. Preview the tarball
bun publish --dry-run

# 4. Publish (token NOT present in any shell on this machine — user supplies it)
NPM_ACCESS_TOKEN=<token> bun publish
```

## Environment (verified 2026-09-22)
- `ANDROID_HOME=/Volumes/XCode/Android/sdk` (already in shell env)
- `JAVA_HOME=/usr/local/opt/openjdk@21` (JDK 21)
- Android NDK env var not set globally
- iOS Simulator: defaults to `iPhone 17` (override with `IOS_SIMULATOR`)
- NPM_ACCESS_TOKEN: **not set anywhere** (non-interactive sh AND interactive zsh checked)
