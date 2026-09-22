# Task Completion Checklist (Post-Restructure)

1. Run `bun run lint` and `bun run typecheck` — ESLint + TypeScript project check
2. Run `bun run format:check` to verify formatting (google-java-format for Android, clang-format Google style for iOS, Prettier for JS/TS)
3. Run `bun run test` for Jest unit tests — **baseline is 376 pass / 14 fail / 390 total**; the 14 are pre-existing flakes (toThrowError quirk in validateAndroidNotification tests + a stale message expectation). Only NEW failures are regressions. See `mem:suggested_commands` for details
4. Run `bun run test:android` for Android JUnit/Robolectric tests (if native Android code changed) — all should pass
5. Run `bun run docs` to regenerate TypeDoc API reference (if TS API changed)
6. If native code changed: `bun run build:core` (Android needs ANDROID_HOME=/Volumes/XCode/Android/sdk + JAVA_HOME=/usr/local/opt/openjdk@21; iOS needs Xcode 16.2+). Rebuild commits the AAR + checksums into packages/react-native/android/libs/
7. If TS API changed or version bumped: `bun run build:rn` — genversion writes src/version.ts from package.json, so dist/version.js must match package.json BEFORE packing

## API-specific rules
- The FCM build-only API is **`buildFcmNotification`** — never write `buildFcmMessage` (see `mem:project_overview`)
- iOS sounds: full filename in bundle root (`psync.wav`); Android channel sounds: res/raw name without extension (`psync`), set at createChannel time (immutable on API 26+)
- Expo plugin target lookups must use `modRequest.projectName` (fallbacks: `name`, `getFirstTarget()`), NEVER `modConfig.name`

## Publishing checklist
1. `npm view @psync/notifee version` — confirm target version is free (9.6.0 is burned; do not reuse)
2. `cd packages/react-native && bun run build` (fresh dist with correct version)
3. `bun publish --dry-run` — verify file list + version
4. `NPM_ACCESS_TOKEN=<token> bun publish` — token is NOT in any shell env on this machine; user provides it
5. Verify post-publish: `npm view @psync/notifee version` and spot-check the published tarball for critical symbols (e.g. `npm pack @psync/notifee@X.Y.Z` + grep) — the 9.6.0 stale-publish incident is why

## Git / repo hygiene warnings
- **`example/` is UNTRACKED in git** (0 tracked files, not gitignored) as of 2026-09-22 — it exists only on this workstation's disk. Avoid `git clean -fd`; consider committing it or gitignoring it deliberately
- Commits must follow Conventional Commits (`feat|fix|docs|chore|refactor|test|ci|perf(scope): description`)
- When tests reference the `xcode` npm package: it's CJS-only — use `require()` + `require.resolve('xcode', { paths: [...] })`, and exclude such test files from root tsconfig
- pbxproj test fixtures: use the real `example/ios/example.xcodeproj/project.pbxproj` — hand-written fixtures fail the PEG grammar
