# CLAUDE.md

## Project Overview

Notifee is a feature-rich notifications library for React Native, supporting Android and iOS. This is a monorepo managed with Lerna and Bun workspaces containing the main React Native package, Flutter bindings, and associated native code.

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

## Package Manager

This project uses **Bun** (`bun@1.3.9`) as the package manager.

```bash
# Install dependencies
bun install

# Run scripts
bun run <script>

# Execute a binary
bunx <binary>
```

## Development Setup

**Prerequisites:**
- Bun 1.3.9+
- Node.js 20+
- Java 17 (for Android)
- Xcode (for iOS, macOS only)

**Install dependencies:**

```bash
bun install
```

**Build the TypeScript package:**

```bash
bun run build:core
```

**Watch mode for development:**

```bash
cd packages/react-native && bun run build:watch
```

## Common Commands

| Command | Description |
|---------|-------------|
| `bun run build:core` | Build the core TypeScript package |
| `bun run gen:reference` | Generate TypeDoc API reference |
| `bun run validate:all:js` | ESLint check |
| `bun run validate:all:ts` | TypeScript type check |
| `cd packages/react-native && bun run build` | Build the published package |

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
PATH="/path/to/notifee/node_modules/.bin:$PATH" bunx genversion --es6 --semi src/version.ts && tsc

# Then publish
cd packages/react-native
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
- **peerDependencies:** `react >=19.0.0`, `react-native >=0.81.0`, `scheduler 0.25.0`
- **publishConfig:** `access: public`

## Peer Dependency Requirements

The published package requires:

| Package | Minimum Version |
|---------|----------------|
| `react` | `>=19.0.0` |
| `react-native` | `>=0.81.0` |
| `scheduler` | `0.25.0` |

## Dependency Notes

- **`@types/react-native`** is **not** used — React Native 0.73+ ships its own TypeScript types.
- **`typedoc`** is pinned to `^0.28.0` to support TypeScript 5.8+/5.9.
- **`typedoc-plugin-markdown`** `^4.6.2` and **`typedoc-plugin-remark`** `^2.0.1` are required for typedoc 0.28 compatibility.

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
cd tests_react_native && jest
```

**Android unit tests (JUnit):** Run via the `tests_junit` GitHub Actions workflow.

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
