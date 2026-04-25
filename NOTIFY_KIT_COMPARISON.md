# react-native-notify-kit Parity Tracker

**Last Updated:** 2026-04-18
**Compared repos:**
- **Ours:** `XChikuX/notifee` (`@psync/notifee`)
- **Theirs:** `marcocrupi/react-native-notify-kit`

Both are maintained forks of the original `@notifee/react-native` by Invertase.

---

## Implementation Status Summary

| Category | Status |
|----------|--------|
| TurboModule Migration | ✅ Complete |
| FCM Helpers (JS-only) | ✅ Complete |
| TypeScript Bug Fixes | ✅ Complete |
| Native Bug Fixes (35 upstream) | ⚠️ Partially tracked — see table below |
| `setNotificationConfig()` API | ❌ Not implemented |
| Baseline Profile | ❌ Not implemented |

---

## Architecture Comparison

| Aspect | @psync/notifee | react-native-notify-kit |
|--------|---------------|------------------------|
| **Native Bridge** | ✅ TurboModules (Kotlin/ObjC++) | TurboModules (Kotlin/ObjC++) |
| **Package Manager** | Bun 1.3.10 | Yarn 4.6.0 |
| **Min React Native** | >=0.83.2 | >=0.73.0 |
| **Android SDK** | compileSdk 36, Java 21 | compileSdk 35, Java 17 |
| **Gradle** | 9.0.0, AGP 8.8.2 | Not verified |
| **Single Android Module** | ✅ Source compilation | ✅ Source compilation |
| **TurboModule Spec** | ✅ `src/specs/NativeNotifeeModule.ts` | ✅ `src/specs/NativeNotifeeModule.ts` |
| **Codegen Config** | ✅ In `package.json` | ✅ In `package.json` |

---

## Features Implemented ✅

### TurboModule Migration (Complete)
- ✅ `NativeNotifeeModule.ts` TurboModule spec with full `Spec` interface
- ✅ Android bridge rewritten in Kotlin (6 files)
- ✅ iOS bridge uses Objective-C++ (`.mm`) with TurboModule conformance
- ✅ `codegenConfig` in `package.json`

### FCM Helpers (Complete)
- ✅ `handleFcmMessage()` — turns FCM remote message into Notifee notification
- ✅ `setFcmConfig()` — configure FCM handling behavior
- ✅ `FcmConfig` and `FcmRemoteMessage` types exported
- ✅ `parseFcmPayload` and `reconstructNotification` helpers
- ✅ Jest coverage for FCM behavior

### TypeScript Bug Fixes (Complete)
- ✅ Missing `web: {}` in iOS `getNotificationSettings` response
- ✅ Incorrect `||` operator in `getChannelGroup`/`getChannelGroups` (now `&&`)
- ✅ Missing `ANDROID_API_LEVEL` in native module mock
- ✅ Android-specific cancel notification test coverage

### Additional Features We Have
- ✅ `openPowerManagerSettings()` API
- ✅ `getPowerManagerInfo()` API with `PowerManagerInfo` type
- ✅ `openBatteryOptimizationSettings()` / `isBatteryOptimizationEnabled()` APIs
- ✅ `openAlarmPermissionSettings()` API
- ✅ Higher minimum requirements (RN 0.83+, React 19.2+, compileSdk 36)
- ✅ Modern Jest 30 with babel-jest
- ✅ Comprehensive CI workflows
- ✅ TypeDoc documentation generation

---

## Features Not Yet Implemented ❌

### `setNotificationConfig()` API
**Priority:** Medium
**Effort:** Requires native implementation on both platforms

The `react-native-notify-kit` fork provides `setNotificationConfig()` with an opt-out flag to prevent Notifee from intercepting iOS remote notification handlers. This addresses upstream issue #912 where Notifee breaks `@react-native-firebase/messaging`'s `onNotificationOpenedApp` / `getInitialNotification`.

**What's needed:**
- iOS native: Add a configuration flag to `NotifeeCore` that controls whether `UNUserNotificationCenterDelegate` interception is active for remote notifications
- Android native: No-op or equivalent configuration storage
- TypeScript: Add `setNotificationConfig(config: NotificationConfig)` to `Module` interface, `NotifeeApiModule`, `NativeNotifeeModule` spec, and mock
- Types: Add `NotificationConfig` type with `ios.interceptRemoteNotifications: boolean` field

### Baseline Profile
**Priority:** Low
**Effort:** Android-only, build configuration

The `react-native-notify-kit` fork ships a Baseline Profile that instructs ART to AOT-compile the foreground service notification hot path at install time, eliminating JIT penalty on first invocation.

**What's needed:**
- Add `baseline-prof.txt` to the Android library module
- Configure Baseline Profile generation in the Gradle build

---

## Upstream Bug Fixes Tracker

The `react-native-notify-kit` fork claims 35+ upstream bug fixes. Below tracks which ones need verification or implementation in our codebase. Many of these are native-level fixes that may or may not already be present in our Kotlin/ObjC++ bridge code.

### Legend
- ✅ = Verified fixed in our codebase
- ⚠️ = Needs verification in native code
- ❌ = Not implemented

### iOS Fixes

| Bug | Upstream Issue | notify-kit Version | Our Status | Notes |
|-----|---------------|-------------------|------------|-------|
| Notifee intercepts iOS remote notification tap handlers | #912 | 9.1.12 | ⚠️ Needs `setNotificationConfig()` | Requires new API |
| `completionHandler` not called on notification dismiss | Pre-existing | 9.1.12 | ⚠️ Verify in ObjC++ bridge | |
| `completionHandler` not called in `willPresentNotification` fallback | Pre-existing | 9.1.12 | ⚠️ Verify in ObjC++ bridge | |
| `getInitialNotification()` returns null on cold start | #1128 | 9.1.12 | ⚠️ Verify | Deprecated `UIApplicationLaunchOptionsLocalNotificationKey` check |
| `willPresentNotification:` fallback drops foreground notifications | Pre-existing | 9.1.20 | ⚠️ Verify | Returns None instead of platform defaults |
| All delivered notifications dismissed when app opened | #828 | 9.1.20 | ⚠️ Verify | |
| Duplicate symbols linker error with NSE + static frameworks | Pre-existing | 9.1.22 | ⚠️ Verify | `NotifeeExtensionHelper` compiled by both pods |
| `EventType.DELIVERED` not emitted for `displayNotification()` | Pre-existing | 9.3.0 | ⚠️ Verify | `notifeeTrigger != nil` guard suppressed event |
| `didReceiveNotificationResponse:` delayed 15 seconds | Pre-existing | 9.4.0 | ⚠️ Verify | `dispatch_after` blocking subsequent taps |
| `requestPermission:` swallows `NSError` | Pre-existing | 9.4.0 | ⚠️ Verify | MDM/parental-control failures invisible |
| `contentByUpdatingWithProvider:` errors suppressed | Pre-existing | 9.4.0 | ⚠️ Verify | SiriKit intents silently fail |
| `getBadgeCount:` never calls completion in app extension | Pre-existing | 9.4.0 | ✅ Fixed | Returns `0` in app-extension context instead of hanging |
| NSE attachment downloads no timeout cap | Pre-existing | 9.4.0 | ⚠️ Verify | 60s default exceeds iOS 30s budget |

### Android Fixes

| Bug | Upstream Issue | notify-kit Version | Our Status | Notes |
|-----|---------------|-------------------|------------|-------|
| `getInitialNotification()` returns null without `pressAction` | #1128 | 9.1.12 | ⚠️ Verify | |
| Foreground press events dropped when React not ready | #1279 | 9.1.12 | ⚠️ Verify | |
| Trigger notifications not firing on Android 14-15 (killed) | #1100 | 9.1.12 | ⚠️ Verify | Missing `goAsync()` in BroadcastReceiver |
| `SCHEDULE_EXACT_ALARM` denial drops scheduled alarms | #1100 | 9.1.12 | ⚠️ Verify | No fallback to inexact |
| `getNotificationSettings()` returns DENIED on Android 13+ | #1237 | 9.1.12 | ⚠️ Verify | Before permission requested |
| `AlarmType.SET_EXACT` doesn't work in Doze; `SET` uses `RTC` | #961 | 9.1.12 | ⚠️ Verify | Should use `RTC_WAKEUP` |
| FGS crashes with ANR after ~3 min on Android 14+ | #703 | 9.1.13 | ⚠️ Verify | `shortService` timeout, missing `onTimeout()` |
| Manifest merger failure overriding `foregroundServiceType` | #1108 | 9.1.13 | ⚠️ Verify | |
| FGS notifications dismissible on Android 13+ with `ongoing: true` | #1248 | 9.1.14 | ⚠️ Verify | |
| DST shifts repeating scheduled notifications | #875 | 9.1.14 | ⚠️ Verify | |
| `!=` reference equality on String in `NotificationPendingIntent` | Pre-existing | 9.1.19 | ⚠️ Verify | Latent bug |
| `pressAction.launchActivity` not defaulted at native layer | N/A | 9.1.19 | ⚠️ Verify | Defense-in-depth |
| `app.notifee:core:+` / `FAIL_ON_PROJECT_REPOS` | #1079, #1226, #1262 | 9.2.0 | ✅ Fixed | Single module, source compilation |
| Stale Gradle cache from reused Maven coordinates | N/A | 9.2.0 | ✅ Fixed | Source compilation eliminates this |
| Tapping notification without `pressAction` does nothing | Pre-existing | 9.3.0 | ⚠️ Verify | `createIntent()` with null `pressActionModelBundle` |
| FGS notifications delayed up to 10s on Android 12+ | #272, #1242 | 9.4.0 | ⚠️ Verify | Missing `FOREGROUND_SERVICE_IMMEDIATE` |
| `cancelTriggerNotifications()` race with Room DB | #549 | 9.5.0 | ⚠️ Verify | |
| Trigger notifications lost across reboot on OEM devices | #734 | 9.6.0 | ⚠️ Verify | BOOT_COMPLETED suppressed |
| `RepeatFrequency.DAILY/WEEKLY` fires day 1 only | #601, #1063 | Multi-version | ⚠️ Verify | Stale Room anchors |
| Timestamp triggers lost after reboot on Android 14 | #991 | Multi-version | ⚠️ Verify | |
| `ObjectAlreadyConsumedException` in headless task | #266 | 9.6.0 | ⚠️ Verify | `WritableMap` reuse |
| `getDisplayedNotifications()` no `data` field | #393 | 9.7.0 | ⚠️ Verify | iOS/Android parity |
| Small icon resolution failure crashes in release | #733 | 10.1.0 | ⚠️ Verify | Should fall back to launcher icon |

### Behavioral Changes from notify-kit

These are intentional default changes. Track which ones we've adopted:

| Change | notify-kit Default | Our Status | Notes |
|--------|-------------------|------------|-------|
| AlarmManager instead of WorkManager | Since 9.1.12 | ⚠️ Verify | |
| `SET_EXACT_AND_ALLOW_WHILE_IDLE` default | Since 9.1.12 | ⚠️ Verify | |
| `ongoing: true` for FGS notifications | Since 9.1.14 | ⚠️ Verify | |
| FGS notifications auto re-posted on Android 14+ | Since 9.1.14 | ⚠️ Verify | |
| `pressAction.launchActivity` defaults to `'default'` | Since 9.1.19 | ⚠️ Verify | |
| `pressAction` defaults when omitted | Since 9.3.0 | ⚠️ Verify | |
| No hardcoded `foregroundServiceType` | Since 9.1.13 | ⚠️ Verify | |
| `FOREGROUND_SERVICE_IMMEDIATE` default | Since 9.4.0 | ⚠️ Verify | |
| iOS `EventType.DELIVERED` for all foreground | Since 9.3.0 | ⚠️ Verify | |
| Small icon fallback to launcher icon | Since 10.1.0 | ⚠️ Verify | |

---

## Documented Workarounds (from notify-kit)

These are platform limitations that cannot be fixed in library code, but can be mitigated with documentation and helper APIs:

| Issue | Root Cause | Our Status |
|-------|-----------|------------|
| #410 FGS paused on screen lock (Samsung/Xiaomi) | Vendor battery-saver policies | ✅ `openPowerManagerSettings()` API available |
| #734 Triggers lost across reboot on OEM devices | `BOOT_COMPLETED` suppressed | ⚠️ Need `BOOT_COUNT` cold-start self-heal |
| #927 Custom sound ignored for remote push (bg/killed) | OS delivers before library runs | Documentation only (platform limitation) |

---

## Recommended Implementation Order

For the remaining ⚠️ items, the recommended implementation priority is:

1. **`setNotificationConfig()` API** — Unblocks Firebase interop (#912)
2. **Verify iOS delegate fixes** — completionHandler, willPresentNotification, didReceiveNotificationResponse
3. **Verify Android scheduling fixes** — AlarmManager defaults, DST, reboot recovery
4. **Verify Android press/action fixes** — pressAction defaults, getInitialNotification
5. **Baseline Profile** — Low priority performance optimization

---

## What We Have That They Don't

| Feature | Notes |
|---------|-------|
| Higher minimum requirements | RN 0.83+, React 19.2+, compileSdk 36, Gradle 9.0 |
| Bun package manager | Faster installs and builds |
| Modern Jest 30 | vs Jest 29 with ts-jest |
| Comprehensive CI workflows | Multiple GitHub Actions for tests, linting, building, publishing |
| TypeDoc documentation generation | Automated API reference |
| `openPowerManagerSettings()` + `getPowerManagerInfo()` | Vendor battery settings deep-link |
| `openBatteryOptimizationSettings()` / `isBatteryOptimizationEnabled()` | Battery optimization APIs |
| `openAlarmPermissionSettings()` | Alarm permission settings API |
