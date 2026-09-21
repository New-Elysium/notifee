# Suggested Commands

## Install
```bash
bun install
```

## Build
```bash
bun run build:core          # Build Android & iOS core (gradle + build_ios_core.sh)
bun run build:rn            # Build React Native package (genversion + tsc)
bun run build:all           # build:core + build:rn
bun run build:all:clean     # rimraf build dirs + lerna build:clean
bun run build:rn:watch      # tsc --watch in packages/react-native
```

## Test
```bash
bun run test:all            # test:core:android + tests_rn:test + tests_rn:android:test + tests_rn:ios:test
bun run test:core:android   # cd android && ./gradlew testDebugUnit
bun run tests_rn:test       # cd tests_react_native && jest
bun run tests_rn:test-watch # jest --watch
bun run tests_rn:test-coverage
```

## Validate (Lint + Typecheck)
```bash
bun run validate:all        # ESLint + tsc + gen:reference (typedoc)
bun run validate:all:js     # ESLint only
bun run validate:all:ts     # tsc only
```

## Format
```bash
bun run format:all          # Format core + rn (android + ios)
bun run format:all:check    # Check-only variant
bun run format:core:android # google-java-format on ./android
bun run format:core:ios     # clang-format (Google) on ./ios
```

## Run Example/Test Apps
```bash
bun run run:android         # tests_react_native on Android (debug)
bun run run:ios             # tests_react_native on iOS (iPhone 16 sim)
bun run tests_rn:packager   # Metro for tests app
```

## Misc
```bash
bun run gen:reference       # typedoc API docs
bun run precommit           # clean + prepare + build:all + gen:reference + validate:all + test:all
```
