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
