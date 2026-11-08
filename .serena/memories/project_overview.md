# Notifee Project Overview

## Purpose
Notifee is a feature-rich notifications library for React Native, supporting Android and iOS. The published npm package is `@psync/notifee` (v9.8.0 as of 2026-11-08; next release will be 9.9.0 via semantic-release from `feat` commit `b9d21c5`). Repo: `github.com/New-Elysium/notifee`.

## ⚠️ Version burn incident (2026-09-22)
- `9.6.0` was published to npm (12:44 UTC) from a STALE tree — it contains none of the notify-kit-parity work (no plugin fix, no buildFcmNotification, no MONTHLY, no FGS enum). 9.6.0 is permanently burned; never publish it again.
- `9.7.0` is the version containing all parity/bugfix work (committed `da56822`, `ff01639`, `ba42176`, `b3590e6`).
- Always check `npm view @psync/notifee version` before publishing.

## API naming gotcha
- The FCM build-only flow is **`buildFcmNotification`** (notify-kit's original name). It was NEVER `buildFcmMessage` in committed code — earlier docs/summaries referencing `buildFcmMessage` were corrected in commit `f90755f`. Error messages, docs, example app, and tests all consistently use `buildFcmNotification`.

## Tech Stack
- **TypeScript** ^6.0 (strict mode) for the JS/TS layer
- **Java** (compile target Java 17, toolchain Java 21) for Android native; Robolectric now used for model unit tests
- **Objective-C/C++** for iOS native
- **Bun** (1.3.10) as package manager
- **@lerna-lite** + Bun workspaces for monorepo management
- **Jest** 30 for unit testing, **Cavy** for E2E testing
- **TypeDoc** for API reference generation
- **semantic-release** for CI publishing (local publishing via `bun publish` also used)

## Structure
```
notifee/
├── android/                    # Core Android native (Java) — TimestampTriggerModel supports MONTHLY + repeatInterval, DST-safe java.time advancement
├── ios/                        # Core iOS native (Obj-C/C++)
├── packages/react-native/      # Main RN package (@psync/notifee)
│   ├── src/fcm/                # parseFcmPayload, reconstructNotification, types (notify-kit parity)
│   └── plugin/                 # Expo config plugins (withNotifee, ios.js, android.js)
├── example/                    # Smoke test app — ⚠️ UNTRACKED in git (0 tracked files, not gitignored; exists only on this disk)
├── tests_react_native/         # E2E test suite (Cavy) + Jest unit tests (23 suites)
├── docs/                       # TypeDoc docs
└── .github/workflows/          # CI/CD
```

## Key Facts (9.7.0 API surface additions)
- `RepeatFrequency.MONTHLY` + `TimestampTrigger.repeatInterval?: number` (Android AlarmManager; iOS gated with clear errors — native rolling schedule not ported)
- Timestamp triggers default to **AlarmManager** with `AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE` (was WorkManager/SET_EXACT); `alarmManager: false` opts out; epoch-ms sanity guards
- `AndroidForegroundServiceBehavior` enum (DEFAULT=0/IMMEDIATE=1/DEFERRED=2) + `android.foregroundServiceBehavior`; FGS auto-sets `ongoing: true` and IMMEDIATE behavior on Android 12+
- Fixed `FOREGROUND_SERVICE_IMMEDIATE` constant bug (was `0` = DEFAULT on platform)
- `pressAction: null` opt-out sentinel; duplicate pressAction IDs across actions rejected
- Expo plugin fix (`ff01639`): target resolution uses `modConfig.modRequest.projectName` → `name` → `getFirstTarget()` fallback — `modConfig.name` is the app.json display name, NOT the Xcode target (this was why iOS custom sounds were silently never linked)
- Android channel sounds are immutable on API 26+ — set `sound` (res/raw name, no extension) at createChannel time
- iOS sounds use full filename (`psync.wav`) referencing bundle root; plugin copies to `ios/NotifeeSounds/`

## Key Facts (November 2026 notify-kit-parity batch, commit `b9d21c5`, unreleased → 9.9.0)
Every bug verified as shared with `marcocrupi/react-native-notify-kit` 10.10.0 was fixed, plus the cheapest features:
- **FGS hardening:** all `startForeground()` calls guarded (deny → log + `stopSelf`); `onTimeout` (API 34+) stops service and emits `EventType.FG_TIMEOUT` (9) with `EventDetail.startId`/`fgsType`
- **PendingIntent identity:** `ReceiverService` intents now use a stable data-URI identity (scheme `notifee`, authority `receiver-service`) instead of a process-reset `AtomicInteger` — no cross-restart intent clobbering
- **Actions on Android 12+:** quick actions without `launchActivity`/`mainComponent` route via `ReceiverService` (headless, no unlock); `pressAction: null` attaches no content intent at all (reserved id `__NOTIFEE_OPT_OUT__` rejected by validator)
- **Lazy TurboModule resolution** in `NotifeeNativeModule.ts` (safe early imports in bridgeless); `onForegroundEvent` touches `this.native` first to init the relay
- **Android event buffer:** up to 10 pending events (FIFO, drop-oldest) flushed on `addListener`, requeued if undelivered — no more silent startup event loss
- **HeadlessTask** resets its initialized flags on null ReactContext and re-initializes (no NPE on stale context)
- **`requestPermission`/`shouldShowRequestPermissionRationale`** hop to the UI thread; rationale API is Android 13+, resolves `false` elsewhere (iOS stub returns `NO`)
- **InitialNotificationLedger** (SharedPreferences, tap-only): each tap returned by `getInitialNotification` at most once, even across process death; foreign intents filtered via WeakHashMap identity set
- **Fresco bitmaps copied** (`bitmap.copy`) before use in `ResourceUtils`
- **`getNotificationSettings().android.fullScreenIntent`**: API 34+ special access, API 29–33 `USE_FULL_SCREEN_INTENT`, below 29 `ENABLED` (iOS returns `ENABLED`)
- Deliberately NOT ported: pre-emptive dataSync demotion scheduler (`FG_RUN_LIMIT_REACHED`/`bestEffortStopAfterMs`), Server SDK, `init-nse` CLI, FCM payload extras, iOS rolling rebalance
- Reference fork source was at `$TMPDIR/notify-kit/` (tmp, may be wiped); see `UPSTREAM_ISSUE_TRIAGE.md` "Fixed via notify-kit parity" for the full matrix

## Peer Dependencies (published package)
- `react >=19.2.4`, `react-native >=0.83.2`, `scheduler >=0.25.0` (root resolution pinned to 0.25.0)

## Publishing
- Package name `@psync/notifee`, public access
- Token from env `NPM_ACCESS_TOKEN` (used in `.npmrc` and `bunfig.toml`) — NOT set in any shell on this workstation (checked non-interactive sh and interactive zsh); user must supply it manually at publish time
- Local: `cd packages/react-native && NPM_ACCESS_TOKEN=<token> bun publish`
- CI: semantic-release via `.github/workflows/publish.yml`

## Smoke Test Status
- **iOS**: `bun run smoke:ios` — PASSES end-to-end (iPhone 17 sim); custom audio via `example/assets/psync.wav` (0.27s WAV) confirmed AUDIBLE by user
- **Android**: works on proper hardware only; on this AMD host the emulator dies under QEMU TCG (watchdog). Use the physical OnePlus 9R over Wi-Fi adb or CI
