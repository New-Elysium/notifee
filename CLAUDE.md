# CLAUDE.md

## Project Overview

Notifee is a feature-rich notifications library for React Native, supporting Android and iOS. This is a monorepo managed with Lerna and Yarn workspaces containing the main React Native package, Flutter bindings, and associated native code.

**Published npm package:** `@psync/notifee`

## Repository Structure

```
notifee/
├── android/                    # Core Android native implementation (Java)
├── ios/                        # Core iOS native implementation (Obj-C/C++)
├── packages/
│   ├── react-native/           # Main React Native package (@psync/notifee)
│   └── flutter/                # Flutter bindings
├── tests_react_native/         # E2E test suite
├── docs/                       # TypeDoc-generated documentation
└── .github/workflows/          # CI/CD pipelines
```

## Development Setup

**Prerequisites:**
- Node.js 20+
- Yarn 1.22+
- Java 17 (for Android)
- Xcode (for iOS)

**Install dependencies:**

```bash
yarn install
```

**Build the TypeScript package:**

```bash
yarn run build:core
```

**Watch mode for development:**

```bash
cd packages/react-native && yarn run build:watch
```

## Common Commands

| Command | Description |
|---------|-------------|
| `yarn run build:core` | Build the core TypeScript package |
| `yarn run gen:reference` | Generate TypeDoc API reference |
| `yarn run lint` | Run ESLint across the project |
| `yarn run test` | Run Jest unit tests |
| `cd packages/react-native && yarn run validate:all:ts` | TypeScript type check |
| `cd packages/react-native && yarn run validate:all:js` | ESLint check |
| `cd packages/react-native && yarn run format:android` | Format Android Java files |
| `cd packages/react-native && yarn run format:ios` | Format iOS Obj-C/C++ files |

## NPM Publishing

**Published package name:** `@psync/notifee`

Publishing is automated via [semantic-release](https://semantic-release.gitbook.io/) triggered by the `Publish` GitHub Actions workflow (`.github/workflows/publish.yml`). The release process uses conventional commits to determine version bumps and generates changelogs automatically.

### NPM Access Token

NPM publishing requires an access token available from the environment variable:

```
NPM_ACCESS_TOKEN
```

This token must have publish permissions for the `@psync` npm scope. When running publishing locally or configuring CI, set this environment variable before invoking the release process:

```bash
export NPM_ACCESS_TOKEN=your_token_here
npx semantic-release
```

In GitHub Actions, store the token as a repository secret named `NPM_ACCESS_TOKEN` and reference it in the workflow:

```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_ACCESS_TOKEN }}
```

### Manual Publish Steps

If publishing manually (outside of CI):

```bash
# 1. Install dependencies using npm (not yarn — semantic-release requires npm)
npm i

# 2. Generate build artifacts
npm run build:core
npm run gen:reference

# 3. Run semantic-release
export NPM_ACCESS_TOKEN=your_token_here
NPM_TOKEN=$NPM_ACCESS_TOKEN npx semantic-release
```

### Package Configuration

The `packages/react-native/package.json` `publishConfig` is set to public access with provenance:

```json
"publishConfig": {
  "access": "public",
  "provenance": true
}
```

The package name should be `@psync/notifee` for publishing to the `@psync` npm scope.

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

Examples:
- `feat(android): add support for custom notification sounds`
- `fix(ios): resolve crash on iOS 17 when dismissing notifications`
- `docs: update installation guide`

## Testing

**Unit tests (Jest):**

```bash
yarn run test
# or
cd tests_react_native && yarn test
```

**Android unit tests (JUnit):** Run via the `tests_junit` GitHub Actions workflow or directly with Gradle.

**E2E tests:** Triggered manually via GitHub Actions workflows (`tests_e2e_android.yml`, `tests_e2e_ios.yml`).

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
