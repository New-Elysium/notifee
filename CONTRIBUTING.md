# Contributing

> ⚠️ **New Architecture Only**: This project is built **exclusively for React Native New Architecture** (TurboModules). All contributions must be compatible with React Native 0.83+ and the New Architecture.

## Prerequisites

Ensure you have the following software installed:

- Bun 1.3.10+
- Node.js 24+
- Java 21 (compileSdk 36, source/target Java 17)
- Xcode 16.2+ (for iOS development)
- Android SDK (API 36+) and NDK (27.1.12297006+)
- React Native 0.83+ with New Architecture enabled

## Step 1: Clone the repository

```bash
git clone https://github.com/XChikuX/notifee.git
cd notifee/
```

## Step 2: Install dependencies

```bash
bun install
```

Note: During this step, the `package.json` script `prepare` is called, which includes a call to `build:core:ios`.
During that step, the current "NotifeeCore" iOS files are copied into `packages/react-native/ios/...`. If you modify
iOS core code and want to test it you will want to re-run that step, or temporarily modify `packages/react-native/RNNotifee.podspec`
to contain `$NotifeeCoreFromSources=true` so that the up to date source files are actually incorporated in the final build.

The same issue applies to Android code if you need to see development changes to the NotifeeCore Android code in an Android build. Run `bun run build:core:android` to generate a new AAR file for Android then rebuild/restart the Android app for core Android
changes to take effect.

## Step 3: Start React Native packager

```bash
bun run tests_rn:packager
```

## Step 4: Watch for TypeScript changes

Ensure you have TypeScript compiler running to listen to `react-native` submodule changes:

```bash
bun run build:rn:watch
```

## Testing Code

### Unit Testing

The following package scripts are exported to help you run tests:

- `bun run tests_rn:test` - run Jest tests once and exit.
- `bun run tests_rn:jest-watch` - run Jest tests in interactive mode and watch for changes.
- `bun run tests_rn:jest-coverage` - run Jest tests with coverage. Coverage is output to `./coverage`.

### End-to-end Testing

Tests can be found in the `tests_react_native/specs` directory.

To run tests, use these commands:

- **Android**: `bun run tests_rn:android:test`
- **iOS**: `bun run tests_rn:ios:test`

### Linting & type checking files

Runs ESLint and respective type checks on project files:

```bash
bun run validate:all:js
bun run validate:all:ts
```

## Publishing

Maintainers with write access to the repo and the npm organization can publish new versions by following the release checklist below.

### Release Checklist

#### Automated Process

**Note: release is fully automated now in `.github/workflows/publish.yml` and controlled by the `.releaserc` file.**

Simply navigate to the release publish workflow, and use the manual trigger to publish from main branch:

1. https://github.com/XChikuX/notifee/actions/workflows/publish.yml

Afterwards, you may verify that everything worked by checking the expected work products:

1. Verify that there is a new GitHub release: https://github.com/XChikuX/notifee/releases
1. Verify that there is a new npmjs release (may take a moment to update): https://www.npmjs.com/package/@psync/notifee?activeTab=versions
1. Verify that there is a new tag correctly created: https://github.com/XChikuX/notifee/tags
1. Verify that there is a commit with that tag, with the updated release notes: https://github.com/XChikuX/notifee/commits/main/

#### Manual Process

If for some reason the automated process is not working, these are the steps to take to correctly create and publish a release:

1. Navigate to the React Native package: `cd packages/react-native`
1. Build the package: `bun run build`
1. Bump version: `npm version {major/minor/patch}`
1. Publish to npm: `NPM_ACCESS_TOKEN=your_token bun publish`
1. Commit those changes (after publish so new AAR files are committed)
1. Tag the repo (current format is `@psync/notifee@x.y.z`)
1. Push the release notes / version / tag to the repo: `git push --tags`
1. Create a release on the repo:

    ```bash
    export TAGNAME=`git tag --list|sort -r|head -1`
    gh release create ${TAGNAME} --title "${TAGNAME}" --notes "[Release Notes](https://github.com/XChikuX/notifee/blob/main/docs/react-native/release-notes.mdx)"
    ```
