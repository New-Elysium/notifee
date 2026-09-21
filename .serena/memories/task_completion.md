# Task Completion Checklist

1. Run `bun run validate:all` — ESLint, tsc, and TypeDoc reference generation (note: typedoc may fail on doc-link issues; `validate:all:js` + `validate:all:ts` cover lint/typecheck alone)
2. Run `bun run format:all:check` to verify formatting (google-java-format for Android, clang-format Google style for iOS, Prettier for JS/TS)
3. Run `bun run test:all` when applicable — note it includes E2E (cavy) targets that need devices/simulators; `bun run test:core:android` + `bun run tests_rn:test` are the unit-test subset
4. If native code changed: `bun run build:core` (Android needs JAVA_HOME/ANDROID_HOME/NDK set; iOS needs Xcode 16.2+)
5. If TS API changed: `bun run build:rn` and consider `bun run gen:reference` to refresh docs
6. Commits must follow Conventional Commits (`feat|fix|docs|chore|refactor|test|ci|perf(scope): description`) — required for semantic-release
