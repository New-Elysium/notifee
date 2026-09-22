# AGENTS.md

## Project Overview

Notifee is a feature-rich notifications library for React Native, supporting Android and iOS. This is a monorepo managed with Bun workspaces containing the main React Native package and associated native code.

**Published npm package:** `@psync/notifee`

## Repository Structure

```
notifee/
├── android/                    # Core Android native implementation (Java)
├── ios/                        # Core iOS native implementation (Obj-C/C++)
├── packages/
│   └── react-native/           # Main React Native package (@psync/notifee)
├── example/                    # Smoke test app (npm-managed, runs on iOS sim & Android)
├── tests_react_native/         # E2E test suite (Cavy) + Jest unit tests
├── docs/                       # TypeDoc-generated documentation
└── .github/workflows/          # CI/CD pipelines
```

## Package Manager

**Bun** (`bun@1.3.10`) manages the workspace. The `example/` smoke test app lives **outside** the Bun workspace and manages its own dependencies with **npm** (this avoids Metro/Bun symlink issues — see `example/SYMLINK.md`).

```bash
# Install workspace dependencies (also runs prepare -> build:rn)
bun install

# Run scripts
bun run <script>

# Execute a binary
bunx <binary>
```

## Development Setup

**Prerequisites:**
- Bun 1.3.10+
- Node.js 24+
- Java 21 (for Android, SDK 55 still compiles to JAVA_17)
- Xcode 16.2+ (for iOS, macOS only)
- Android SDK (API 36+)
- Android NDK (27.1.12297006+)

```bash
bun install            # install workspace deps + build the RN package
bun run build          # build core (Android + iOS) and RN package
bun run test           # Jest unit tests
bun run smoke:setup    # first time only: npm install + pod install for example/
bun run smoke:ios      # launch smoke test app on iOS simulator (iPhone 17 default)
bun run smoke:android  # launch smoke test app on Android
```

### Before Publishing

```bash
cd packages/react-native && bun run build:watch
```

## Local Development Hardware

The dev workstation for this project is an **x86_64 macOS host (Darwin 26.4) with an AMD Ryzen 9 6900HS CPU**.

Implications for Android emulation:

- Apple's **Hypervisor.framework (HVF) is not available** on this host — `sysctl kern.hv_support` returns `0`. HVF requires an Intel CPU with VT-x, EPT and Unrestricted Guest support.
- `emulator -accel-check` can misleadingly print `accel: 0` / `Hypervisor.Framework OS X Version 26.4`. This is a **false positive**; the emulator's real engine fails at `-enable-hvf`:
  ```
  HVF error: HV_ERROR
  qemu-system-x86_64-headless: failed to initialize HVF: Invalid argument
  ```
  To observe it, run an AVD with `-accel on -verbose` and inspect the QEMU argv/error lines.
- Android AVDs therefore run under **QEMU TCG software emulation**. Launch them with `-no-accel` (the local `Pixel_API36_16KB` AVD is started this way); expect slow boot and I/O.
- Keep using **x86_64** system images (`system-images;android-36.1;google_apis_playstore;x86_64`). Do **not** switch to an arm64 image: Rosetta 2 is Apple-silicon only and does not exist on x86_64, so arm64 would also fall back to TCG — slower than x86_64 TCG — and requires a ~1.5 GB download.

## Environment Variables

```bash
# Android SDK location
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.2.12479018

# Java (if using non-default version)
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home
```

- The smoke test app pins its own SDK path via `example/android/local.properties` (gitignored); in this dev environment it points to `/Volumes/XCode/Android/sdk`.
- iOS simulator selection defaults to `iPhone 17`; override with `IOS_SIMULATOR="..."` when running `smoke:ios` / `e2e:ios`.

## Known Limitations (This Workstation)

**Android emulator on this AMD host:** This workstation lacks Apple Hypervisor.framework (HVF) support because it uses an AMD Ryzen CPU. The Android emulator runs under QEMU TCG software emulation (`-no-accel`), which is ~50-100x slower than hardware-accelerated emulation. As a result:

- The Android `system_server` watchdog triggers every ~4-5 minutes, killing the system process and any running apps
- `bun run smoke:android` against the **emulator** will **not** complete successfully on this machine
- The iOS smoke test (`bun run smoke:ios`) works correctly
- For local Android testing use the **physical device over Wi-Fi adb** (see [Example App notes](#example-app-example--react-native-087-notes) below), CI (GitHub Actions), or Intel/Apple Silicon Macs with HVF

The `smoke:android` script is correct and works on supported hardware. This is a host limitation, not a project issue.

## Example App (`example/`) — React Native 0.87 Notes

The smoke test app runs `react@^19.3.0` + `react-native@^0.87.1` (Fabric-only) on both platforms. Non-obvious requirements:

### Metro must resolve a single React Native copy (both platforms)

`example/metro.config.js` pins `react-native`/`react` resolution to the example's own copies via `resolveRequest`. The repo root's Bun workspace also installs its own `react-native@0.83.x` (for `tests_react_native`), and without the pin, files outside `example/` (the linked `@psync/notifee` sources) resolve that second copy. Bundling two RN copies yields two `AppRegistry` instances — `registerComponent()` lands on one while native `runApplication()` checks the other — so the app shows a **black screen** with `Invariant Violation: "example" has not been registered` even though registration succeeded.

### iOS: build RN core from source

RN 0.87's prebuilt core tarball is missing `ReactNativeHeaders.xcframework` on this x86_64 host, so `Pods/React-Core-prebuilt/Headers/module.modulemap` is never created and the build fails with `module map file ... not found`. Reinstall pods with prebuilt disabled:

```bash
cd example/ios && RCT_USE_PREBUILT_RNCORE=0 npx pod-install
```

### Android: RN 0.87 / AGP 9 requirements

- `gradle/wrapper/gradle-wrapper.properties` → Gradle **9.4.1+** (RN 0.87 minimum; older wrappers fail with "Minimum supported Gradle version is 9.4.1").
- `gradle.properties` → `android.builtInKotlin=false` and `android.newDsl=false` (AGP 9's built-in Kotlin conflicts with applying `org.jetbrains.kotlin.android`: "Cannot add extension with name 'kotlin'").
- `android/build.gradle` → `kotlinVersion = "2.2.0"`.
- `android/app/build.gradle` → `getDefaultProguardFile("proguard-android-optimize.txt")` (AGP 9 removed `proguard-android.txt`).
- `patches/@react-native+gradle-plugin+0.87.1.patch` forces the Kotlin `jvmToolchain(21)` (JDK 17 toolchain provisioning is unavailable on this machine — see the root `build.gradle` comment).

### iOS-only notification values

`IOSNotificationInterruptionLevel` is a TypeScript **type union** (`'active' | 'critical' | 'passive' | 'timeSensitive'`), not a runtime enum — use the string literals. (Most other exported constants — `AndroidImportance`, `EventType`, `TriggerType`, ... — are real enums.)

### Physical Android device over Wi-Fi adb

The OnePlus 9R (Android 16, `arm64-v8a`) is the practical local Android test target on this machine:

```bash
# Pair/enabled via Settings → Developer options → Wireless debugging
adb connect <phone-ip>:<port>
adb -s <phone-ip>:<port> reverse tcp:8081 tcp:8081   # so the app can reach Metro
ANDROID_SERIAL=<phone-ip>:<port> npx react-native run-android --no-packager
```

- Re-run `adb reverse` after reconnecting, and make sure Metro (`bun run smoke:start`) is actually running — the device fails with "Unable to load script" otherwise.
- The same phone can appear twice in `adb devices` (USB serial + `adb-<serial>-*. _adb-tls-connect._tcp`); pin `ANDROID_SERIAL` to one of them.

## Scripts Reference

### Root Package Scripts

**Build**
- `build` - Build everything (RN package + core Android/iOS)
- `build:rn` - Build React Native package (genversion + tsc)
- `build:rn:watch` - Watch-mode build of the RN package
- `build:core` - Build core libraries (Android + iOS)
- `build:core:android` - Gradle build of `android/` (publishes the AAR into the RN package)
- `build:core:ios` - Copy the NotifeeCore pod into `packages/react-native/ios`
- `clean` - Remove all build artifacts

**Quality**
- `lint` / `lint:fix` - ESLint
- `typecheck` - TypeScript project check
- `format` / `format:check` - google-java-format (Android) + clang-format (iOS)
- `docs` - TypeDoc API reference generation
- `precommit` - clean + build + docs + lint + typecheck + format:check + all unit tests

**Test**
- `test` / `test:watch` / `test:coverage` - Jest unit tests (`tests_react_native`)
- `test:android` - Android JUnit tests (`gradlew testDebugUnit`)

**E2E (Cavy suite in `tests_react_native/`)**
- `e2e:start` - Metro bundler for the E2E app
- `e2e:android` / `e2e:ios` - Run the E2E suite on a device/emulator/simulator
- `e2e:build:android` - Assemble the E2E debug app
- `e2e:pods` - pod install for the E2E app

**Smoke test app (`example/`)**
- `smoke:setup` - One-time setup: build RN package, then npm install + pod install
- `smoke:ios` / `smoke:android` - Launch the smoke test app on iOS simulator / Android
- `smoke:start` - Metro bundler for the smoke test app
- `smoke:pods` - Re-run pod install for the smoke test app

### React Native Package Scripts (`packages/react-native`)

- `build` - Build TypeScript to `dist/`
- `build:watch` - Build with watch mode
- `build:clean` - Remove build artifacts
- `format:android` - Format Java code
- `format:ios` - Format Objective-C/C++ code

### Smoke Test App Scripts (`example/`, run with npm)

- `android` - Run on Android
- `ios` - Run on iOS
- `start` - Start Metro bundler
- `lint` / `test` - ESLint / Jest for the app

## NPM Publishing

**Published package name:** `@psync/notifee`

### NPM Access Token

NPM publishing requires an access token available from the environment variable:

```
NPM_ACCESS_TOKEN
```

This token must have publish permissions for the `@psync` npm scope. It is configured in two places:

**`.npmrc`** — used by npm and bun for registry authentication:
```
//registry.npmjs.org/:_authToken=${NPM_ACCESS_TOKEN}
```

**`bunfig.toml`** — used by `bun publish` for publish settings:
```toml
[publish]
access = "public"
token = "$NPM_ACCESS_TOKEN"
```

### Publishing Locally

```bash
# Build the package first
cd packages/react-native
bun run build

# Then publish
NPM_ACCESS_TOKEN=your_token bun publish
```

### CI Publishing (GitHub Actions)

Publishing is automated via semantic-release triggered by the `Publish` workflow (`.github/workflows/publish.yml`). Store the token as repository secret `NPM_ACCESS_TOKEN`.

In the workflow:
```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_ACCESS_TOKEN }}
  NPM_ACCESS_TOKEN: ${{ secrets.NPM_ACCESS_TOKEN }}
```

### Package Configuration

`packages/react-native/package.json`:
- **name:** `@psync/notifee`
- **peerDependencies:** `react >=19.2.4`, `react-native >=0.83.2`, `scheduler >=0.25.0`
- **publishConfig:** `access: public`

## Peer Dependency Requirements

The published package requires:

| Package | Minimum Version |
|---------|----------------|
| `react` | `>=19.2.4` |
| `react-native` | `>=0.83.2` |
| `scheduler` | `>=0.25.0` |


## Code Style

- **TypeScript** with strict mode enabled
- **ESLint** with `@react-native-community` presets and Prettier integration
- **Prettier** for JS/TS formatting
- **google-java-format** for Android Java files
- **clang-format** (Google style) for iOS Obj-C/C++ files
- **Conventional Commits** for all commit messages (required for semantic-release versioning)

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

Types: feat, fix, docs, chore, refactor, test, ci, perf
```

## Testing

**Unit tests (Jest):**

```bash
bun run test
```

**Android unit tests (JUnit):**

```bash
bun run test:android
```
(Run via the `tests_junit` GitHub Actions workflow in CI.)

**E2E tests:** Triggered manually via GitHub Actions workflows (`tests_e2e_android.yml`, `tests_e2e_ios.yml`), or locally via `bun run e2e:android` / `bun run e2e:ios`.

**Smoke test:** `bun run smoke:ios` / `bun run smoke:android` launches the `example/` app for manual verification.

## CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `publish.yml` | Manual (main branch) | Semantic-release publish to npm |
| `linting.yml` | PR / push | ESLint, TypeScript, formatting checks |
| `tests_jest.yml` | PR / push | Jest unit tests |
| `tests_junit.yml` | PR / push | Android JUnit tests |
| `tests_e2e_android.yml` | Manual | Android E2E tests |
| `tests_e2e_ios.yml` | Manual | iOS E2E tests |
| `docs_deployment.yml` | Merge to main | Deploy documentation |
