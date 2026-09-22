# Task Completion Checklist (Post-Restructure)

1. Run `bun run lint` and `bun run typecheck` — ESLint + TypeScript project check
2. Run `bun run format:check` to verify formatting (google-java-format for Android, clang-format Google style for iOS, Prettier for JS/TS)
3. Run `bun run test` for Jest unit tests (in `tests_react_native/`)
4. Run `bun run test:android` for Android JUnit tests (if native Android code changed)
5. Run `bun run docs` to regenerate TypeDoc API reference (if TS API changed)
6. If native code changed: `bun run build:core` (Android needs JAVA_HOME/ANDROID_HOME/NDK; iOS needs Xcode 16.2+)
7. If TS API changed: `bun run build:rn` (generates version + compiles to dist/)
8. For smoke testing: `bun run smoke:ios` (works on this machine), `bun run smoke:android` (requires CI/HVF hardware)
9. Commits must follow Conventional Commits (`feat|fix|docs|chore|refactor|test|ci|perf(scope): description`) — required for semantic-release
10. Before publishing: `cd packages/react-native && bun run build:watch` then `NPM_ACCESS_TOKEN=... bun publish`