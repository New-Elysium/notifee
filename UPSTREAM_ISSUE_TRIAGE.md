# Upstream Issue Triage — Current Status Summary

This file is a condensed status snapshot of upstream issues reviewed against the current fork.
All issues reference the archived `invertase/notifee` repository (archived April 7, 2026).
Status was verified via online research and codebase inspection in June 2025, and re-verified in
November 2026 against the maintained fork `marcocrupi/react-native-notify-kit` (v10.10.0).

This review was also cross-checked against the maintained fork `marcocrupi/react-native-notify-kit`, specifically its `README.md` and the published fix matrix there. That fork claims a broader set of upstream bug fixes that we have worked on as well. We should reverify when possible.

> **November 2026 update:** a full code-level comparison against notify-kit 10.10.0 was completed. Every bug it
> fixed that we shared has now been fixed in this fork as well (see "Fixed via notify-kit parity" below), and the
> cheapest missing features (`FG_TIMEOUT` event, `fullScreenIntent` setting, `shouldShowRequestPermissionRationale`)
> have been ported. The remaining deltas are larger-scope items (Server SDK, CLI scaffolder, FCM payload extras,
> iOS rolling rebalance, pre-emptive dataSync demotion) and are listed under "Still open".

---

## Resolved enough in this fork

These no longer look like active top-level problems:

### `#1121` Official Expo config plugin
- This fork now ships an Expo config plugin and documents it.

### `#912` Notifee should not break React Native Firebase
- There is now an explicit iOS config path to avoid interception behavior.

### `#880` Android `getInitialNotification` does not consume the notification
- Current Android code consumes/removes the initial notification extras after reading them.
- **November 2026:** consumption is now also durable — a tap ledger guarantees each tap is returned at most once,
  even across process restarts (see "Fixed via notify-kit parity" — notify-kit `#88`).

### `#877` Android quick action always requires device unlock on Android 12+
- **Fixed.** Quick actions whose `pressAction` has no `launchActivity`/`mainComponent` now route through `ReceiverService`
  (headless broadcast) on all API levels, including `targetSdk >= S`. They no longer launch the activity — which is
  what forced the unlock — and are handled in the background instead. Actions that explicitly set
  `launchActivity`/`mainComponent` still open the app. See `NotificationManager.java`
  (`shouldCreateLaunchActivityIntent` check) and `NotificationPendingIntent.java`.

### `#870` Android `onBackgroundEvent` vs `getInitialNotification` inconsistency
- **Possibly improved in v9.1.2, but not confirmed closed in this fork.** The reported root cause was a React Native new architecture (Fabric/TurboModules) compatibility bug where `onBackgroundEvent` would not fire on Android 13+ when the app was in the quit state.
- v9.1.2 appears to have improved new architecture compatibility, and a comment from the original reporter indicates they planned to retest against that version.
- **Workaround for legacy or uncertain cases:** Use a guard pattern with `getInitialNotification()` to prevent double-handling across Android versions.

---

## Fixed in this fork (code changes applied)

These issues received direct code fixes in the `@psync/notifee` fork:

### `#1283` Android `createTriggerNotification` randomly executed — **FIXED**
- **Problem:** When calling `createTriggerNotification()` multiple times in rapid succession (e.g., 7 times), only 1 or 2 notifications were actually registered on Android. The DB write was fire-and-forget, and WorkManager/AlarmManager scheduling could execute before the DB write completed, causing silent failures.
- **Root cause:** `WorkDataRepository.insertTriggerNotification()` submitted the DB insert to an executor without awaiting completion. The subsequent `workManager.enqueueUniqueWork()` with `ExistingWorkPolicy.REPLACE` could fire before the DB row existed, causing `doScheduledWork()` to find null data.
- **Fix applied:** Added `insertAwait()` and `insertTriggerNotificationAwait()` methods to `WorkDataRepository` that return `ListenableFuture<Void>`. Both `createTimestampTriggerNotification` and `createIntervalTriggerNotification` in `NotificationManager` now use `Futures.addCallback()` to await DB write completion before scheduling with WorkManager or AlarmManager.

### `#875` Scheduled notification fired at wrong time after DST / time change — **FIXED**
- **Problem:** Repeating daily/weekly trigger notifications drifted by ±1 hour after DST transitions because `setNextTimestamp()` added fixed millisecond intervals (86,400,000 ms for DAILY) instead of advancing by calendar days.
- **Root cause:** `TimestampTriggerModel.setNextTimestamp()` used `timestamp += DAY_IN_MS` which is an absolute duration, not a wall-clock time preservation. A notification scheduled for 8:00 AM would fire at 9:00 AM after "spring forward" or 7:00 AM after "fall back."
- **Fix applied:** `setNextTimestamp()` now uses `java.time` (`ZonedDateTime`) for DAILY and WEEKLY frequencies, advancing by calendar days/weeks via `plusDays(1)`/`plusWeeks(1)` which preserves wall-clock time across DST boundaries. HOURLY continues using fixed intervals (correct for absolute time). Also added `DATE_CHANGED` to the `TimeChangeBroadcastReceiver` intent filter in `AndroidManifest.xml` for better DST transition detection.

### `#826` iOS `createTriggerNotification` fails with minimal/silent config — **FIXED**
- **Problem:** When calling `createTriggerNotification` with no `title`, `body`, or `sound`, iOS silently rejected the notification. `getTriggerNotifications()` showed it was never scheduled.
- **Root cause:** Apple's `UNUserNotificationCenter` rejects notification requests where the `UNNotificationContent` has empty title, empty body, no sound, and no attachments. The code had no default sound and no error logging for the failure path. Additionally, when trigger parsing returned nil, the code called `block(nil)` (indicating success) instead of returning an error.
- **Fix applied:**
  1. `buildNotificationContent` now defaults `content.sound` to `[UNNotificationSound defaultSound]` when no title, body, sound, or attachments are provided, preventing Apple from silently rejecting the request.
  2. Added `NSLog` error logging when `addNotificationRequest` fails for better debuggability.
  3. Changed the nil-trigger path to return a descriptive `NSError` (domain `NotifeeCore`, code 1001) instead of silently succeeding.

### Fixed via notify-kit parity (November 2026)

The following were identified by diffing against `marcocrupi/react-native-notify-kit` v10.10.0, confirmed present in
our code, and fixed. Notify-kit issue numbers are referenced where applicable.

#### Foreground service `startForeground()` denial crash (notify-kit `#81`) — **FIXED**
- **Problem:** `ForegroundService.onStartCommand` called `startForeground(...)` without any try/catch. On Android 12+,
  a framework retry or start-intent redelivery can be denied (`ForegroundServiceStartNotAllowedException`), crashing
  the app. The caller-side `start()` path was guarded; the service-side promotion path was not.
- **Fix applied:** All `startForeground` promotions now go through `tryStartForeground(...)` helpers which catch the
  exception, log it, and `stopSelf(startId)` cleanly (`ForegroundService.java`).

#### ReceiverService PendingIntent identity collision (notify-kit `#69`) — **FIXED**
- **Problem:** `ReceiverService.createIntent` keyed PendingIntents off a static `AtomicInteger` that resets to `0` on
  process death. With `FLAG_UPDATE_CURRENT`, dismiss/action intents attached to already-posted tray notifications
  could be silently overwritten with another notification's payload after a restart, routing taps/dismissals to the
  wrong notification.
- **Fix applied:** PendingIntent identity is now a stable Intent data URI (scheme `notifee`, authority
  `receiver-service`, notification + request identity in query params plus `*Present` flags) with a fixed request
  code of `0`, so the same logical intent resolves to the same PendingIntent across restarts (`ReceiverService.java`).

#### Android 12+ quick actions launching the app — upstream `#877` twin (notify-kit `#38`) — **FIXED**
- Covered under `#877` above: actions without launch metadata route headlessly via `ReceiverService` on all API levels.

#### Import-time TurboModule resolution (notify-kit `#42`) — **FIXED**
- **Problem:** `NotifeeNativeModule`'s constructor called `TurboModuleRegistry.getEnforcing()` and `src/index.ts`
  constructed the module at import time. In bridgeless mode, early imports (e.g. `onBackgroundEvent` registered in
  `index.js`) could throw because the TurboModule manager was not yet available.
- **Fix applied:** TurboModule + `NativeEventEmitter` resolution is now lazy (resolved on first access of `native`).
  `onForegroundEvent` touches `this.native` first so the event relay is initialized on subscription
  (`NotifeeNativeModule.ts`, `NotifeeApiModule.ts`).

#### HeadlessTask stale `ReactContext` (notify-kit `#39`) — **FIXED**
- **Problem:** `HeadlessTask`'s `mIsReactContextInitialized` flag was never reset when the React context became null,
  so a later `invokeStartTask(getReactContext(context)!!)` could NPE, with no stale-context restart path.
- **Fix applied:** All state flags reset when the context goes null and the context is re-initialized on the next
  task; task-queue draining re-checks context identity (`HeadlessTask.kt`).

#### `requestPermission()` on the native-modules thread (notify-kit `#92`) — **FIXED**
- **Problem:** `NotifeeApiModule.kt` called `activity.requestPermissions(...)` directly in the promise method on the
  native-modules thread. During screen transitions the activity can be null mid-call, producing rejections/NPEs.
- **Fix applied:** Both `requestPermission` and the new `shouldShowRequestPermissionRationale` hop to the UI queue
  thread before touching the activity, and reject with `ERR_NO_ACTIVITY` when there is no foreground activity.

#### Fresco-owned bitmap lifetime — **FIXED**
- **Problem:** `ResourceUtils.getImageBitmapFromUrl` handed the Fresco-owned bitmap straight out of
  `onNewResultImpl` without copying it. Fresco can recycle the bitmap while Notifee still holds it (BigPicture /
  MessagingStyle), causing crashes or parcel corruption.
- **Fix applied:** The bitmap is copied (`bitmap.copy(config, false)`) before being returned (`ResourceUtils.java`).

#### Android startup event loss (notify-kit 10.5.0 fix) — **FIXED**
- **Problem:** `NotifeeReactUtils.sendEvent` silently dropped events when there was no active ReactContext — the
  Android twin of the iOS `dispatch_once` flush bug fixed earlier in this fork. Events emitted while the React
  instance was starting (a common window on cold start) were lost forever.
- **Fix applied:** The Kotlin bridge now buffers up to 10 pending events (FIFO, oldest dropped) and flushes them on
  listener registration; undelivered events are requeued when the context goes away (`NotifeeReactUtils.kt`,
  `NotifeeApiModule.kt` `addListener`). This substantially narrows the readiness gap referenced under `#1279`.

#### Initial-notification replay after process death (notify-kit `#88`) — **FIXED**
- **Problem:** In-process consumption of the initial notification (sticky event + `removeExtra`) does not survive
  process death: Android re-delivers the original activity Intent with extras restored, so a cold-start tap could be
  replayed and double-handled after a crash/restart cycle.
- **Fix applied:** A durable tap-only ledger (`InitialNotificationLedger`, SharedPreferences) records each tap with a
  sequence number; `getInitialNotification` claims taps atomically and ignores foreign/replayed intents via a
  WeakHashMap identity set. Each notification tap is now returned at most once, even across process restarts
  (`InitialNotificationLedger.java`, `Notifee.java`, `NotificationReceiverHandler.java`). This closes the remaining
  replay gap referenced under `#880` / `#1128`.

#### New API surface ported from notify-kit — **ADDED**
- `EventType.FG_TIMEOUT` (`9`): emitted when Android 14+ times out a running foreground service; `EventDetail`
  gains `startId` / `fgsType` (`types/Notification.ts`, `ForegroundService.java` `handleTimeout`,
  `NotificationEvent.java`).
- `getNotificationSettings().android.fullScreenIntent`: full-screen intent access state (API 34+ special access,
  API 29–33 `USE_FULL_SCREEN_INTENT` grant, below 29 `ENABLED`) (`Notifee.java`, `types/NotificationAndroid.ts`).
- `shouldShowRequestPermissionRationale()`: Android 13+ `POST_NOTIFICATIONS` rationale check; resolves `false`
  elsewhere (`NotifeeApiModule.kt`, `NotifeeApiModule.mm` stub, `types/Module.ts`).
- Explicit `pressAction: null` opt-out: no content intent is attached at all — no app launch, no unlock requirement,
  no `PRESS` event; the reserved `__NOTIFEE_OPT_OUT__` id is rejected by the validator
  (`validateAndroidNotification.ts`, `validateAndroidPressAction.ts`, `NotificationManager.java`).

#### Still open from the notify-kit comparison (deliberately not ported yet)
- Pre-emptive `dataSync` demotion / `foregroundServiceBestEffortStopAfterMs` (their 10.9.0; requires an
  `AlarmManager`-based self-limit scheduler) — the `FG_TIMEOUT` event now makes the timeout observable, but OEM
  freezes that never invoke `onTimeout` remain unmitigated (their `#82`, open upstream there too).
- Server SDK (`/server` subpath, `buildNotifyKitPayload`), `init-nse` CLI scaffolder, FCM Mode payload extras
  (`subtitle`, `circularLargeIcon`, expanded styles, action `icon`/`input`), iOS rolling-schedule rebalancing.
- Baseline Profile / WarmupHelper equivalents (we deliberately ship no warmup code — low value for this fork).

---

## Partially addressed, but still worth tracking

These have meaningful improvements, but do not look fully closed:

### `#1128` Press notification data missing in some app states
- **Status:** Open upstream. Partially addressed in this fork.
- **Problem:** When pressing a notification, `detail.notification.data` is empty when the app is in the quit state or foreground, but works correctly in the background state. This specifically affects FCM + Notifee integration.
- **Root cause:** There are two overlapping causes:
  1. When FCM sends a notification with a `notification` payload (not data-only), the OS handles display natively. Notifee's event system never fully owns the press lifecycle because the notification was not created via `notifee.displayNotification()`.
  2. Upstream Android/iOS initial-notification handling had edge cases where cold-start data could be lost or returned as `null`.
- **Current state in this fork:** Several notify-kit-style fixes already appear to exist locally:
  - Android `getInitialNotification()` returns a canonical payload shape and includes `pressAction` when present.
  - Android initial notification extras are consumed after read, avoiding duplicate delivery.
  - **November 2026:** a durable tap ledger now guarantees each tap is returned at most once, even across process
    restarts (see "Fixed via notify-kit parity" — notify-kit `#88`). The Android cold-start replay gap is closed.
  - iOS initial-notification gathering and response storage are already more complete than the archived upstream implementation.
- **Remaining gap:** The main unresolved part now looks less like missing initial-notification plumbing and more like cross-state parity for FCM-owned notifications vs Notifee-owned notifications. In other words, this is now primarily an integration/lifecycle ownership problem plus a testing gap.
- **Workaround:** Send **data-only FCM messages** (no `notification` key in payload) and use `messaging().setBackgroundMessageHandler()` → `notifee.displayNotification()` to ensure Notifee owns the full lifecycle. For quit state, use `messaging().getInitialNotification()` as fallback when the notification was OS-owned.
- **Comparison with `react-native-notify-kit`:** Its README explicitly claims fixes for `#1128` on both platforms. Based on local code inspection, this fork already appears to contain at least part of that same fix direction.
- **Gap in this fork:** Cross-state parity is still not regression-tested. An E2E test matrix (see `#1126`) would help verify data availability across all app states.

### `#1079` Dependency locking / packaging reliability
- **Status:** Open upstream. Partially improved in this fork.
- **Problem:** Build fails when Gradle dependency locking is enabled (Gradle 8+, which ships with RN 0.74+) because Notifee's local Maven repository uses a dynamic version (`app.notifee:core:+`) incompatible with dependency locking. Additionally, the local maven metadata XML triggers a legacy XML parser issue.
- **Improvement:** The fork's build system rework has improved packaging infrastructure. The inlined RN Firebase Gradle helper and modernized build tooling reduce the surface area for this class of issue.
- **Comparison with `react-native-notify-kit`:** Its README claims this class of issue was fully eliminated in `9.2.0` by removing the bundled AAR/Maven-repo distribution model and compiling the native core from source as part of the bridge module. That is a stronger architectural fix than the current state of this fork.
- **Gap:** The specific Gradle 8 dependency locking issue with dynamic `core:+` version notation has not been explicitly verified as fixed here. Testing with `resolutionStrategy.activateDependencyLocking()` enabled would confirm. Related to `#1115` (testing against packaged artifact vs source).

---

## Still open / still structurally present

These remain relevant in the current codebase. The original `invertase/notifee` repo is archived and will not address them.

### Lifecycle / event handling

#### `#1279` `onBackgroundEvent` does not trigger when pressing push notification
- **Status:** Open upstream. Not fully closed in this fork.
- **Problem:** `notifee.onBackgroundEvent()` is not triggered when pressing a push notification while the app is in the background or quit state. Foreground handling works.
- **Root cause:** When FCM sends a notification with a `notification` payload, the OS handles display and tap natively. Notifee never gets the press event because it did not create the notification. This is an architectural limitation of how FCM display notifications interact with Notifee's event system. There is also a separate Android-side readiness problem where foreground press events can be dropped if the React instance is not ready yet.
- **Current state in this fork:** The React-instance-readiness edge case is now fixed: events emitted while the
  React instance is starting are buffered (max 10, FIFO) and flushed/requeued, so foreground press events are no
  longer dropped (see "Fixed via notify-kit parity" above). However, that does not by itself solve the OS-owned FCM
  notification path.
- **Workaround:** Send **data-only FCM messages** and use `messaging().setBackgroundMessageHandler()` → `notifee.displayNotification()`. For quit state, use `notifee.getInitialNotification()` as fallback.
- **Comparison with `react-native-notify-kit`:**
  - Its README claims an Android fix for `#1279`: foreground press events no longer get dropped when the React instance is not ready. **This fork now has the equivalent fix** (pending-event buffer + requeue).
  - It also introduces an explicit FCM handling path (`handleFcmMessage` / “FCM Mode”) to make Notifee the single display layer across Android and iOS. This fork already ships `setFcmConfig`/`buildFcmNotification`/`handleFcmMessage` with a narrower payload contract.
- **Gap in this fork:** No first-class FCM ownership docs/guide equivalent to notify-kit's FCM Mode, and its extra
  payload fields (`subtitle`, `circularLargeIcon`, expanded styles, action `icon`/`input`) are not yet supported in
  the FCM wire contract.

#### `#1076` iOS `onBackgroundEvent` PRESS / DISMISSED / DELIVERED issues
- **Status:** Open upstream. More likely documentation/verification gap than missing core implementation in this fork.
- **Problem:** On iOS, trigger notification press/dismissed/delivered events don't fire in `onBackgroundEvent`. Only `EventType.TRIGGER_NOTIFICATION_CREATED` (type 7) fires. Android works correctly.
- **Root cause:** Upstream behavior has been confusing because iOS app-state transitions around notification taps are subtle. In archived Notifee, this often looked like a platform difference, but the maintained fork documents a more precise routing rule.
- **Current state in this fork:** Local iOS delegate code already appears substantially closer to the notify-kit model than the archived upstream behavior:
  - foreground `DELIVERED` is emitted for Notifee-owned notifications
  - response handling stores initial notification details
  - event routing is based on the actual notification response path rather than a simplistic foreground-only assumption
- **Comparison with `react-native-notify-kit`:**
  - Its README explicitly documents which handler fires on iOS in each app state.
  - It states that tapping a notification while the app is backgrounded or killed should still route `PRESS` to `onBackgroundEvent`, because iOS delivers the delegate callback while the app state is `Inactive`, not `Active`.
  - That means at least part of the upstream confusion may have been due to incomplete or incorrect event routing/documentation rather than an unavoidable platform limitation.
- **Gap in this fork:** The biggest remaining gap is that this behavior is not clearly documented or regression-tested here. Before claiming parity, it should be validated with targeted lifecycle tests and then documented explicitly.

#### `#1041` iOS foreground APNS notification listener behavior
- **Status:** Open. **By design** — not a Notifee bug.
- **Problem:** APNS notifications sent directly (bypassing FCM) with `apns-push-type: background` do not trigger Notifee event handlers when the app is in the foreground.
- **Root cause:** Notifee is a **local notification library**. It only knows about notifications it creates via `displayNotification()` or `createTriggerNotification()`. Raw APNS payloads that bypass `notifee.displayNotification()` will never trigger Notifee event handlers. Additionally, `apns-push-type: background` causes iOS to suppress foreground presentation entirely.
- **Workaround:** Route through FCM → `messaging().onMessage()` → `notifee.displayNotification()`. Use `apns-push-type: alert` instead of `background` for foreground-presentation notifications. Set `foregroundPresentationOptions` with `banner: true, list: true, sound: true`.
- **Action needed:** Close with "won't fix" / "by design" label. Add FAQ entry clarifying that Notifee does not handle raw APNS notifications.

### Scheduling / trigger behavior

#### `#1100` Android 14+ scheduled notifications not displayed when app is killed
- **Status:** Open upstream. Substantially mitigated in this fork, but not fully closed.
- **Problem:** On Android SDK 34 (Android 14), scheduled trigger notifications only display when the app is open/foregrounded. When the app is killed (swiped away), the notification never appears.
- **Root cause:** Android 14 has stricter background execution limits. Force-stopping an app cancels all `PendingIntent`-based alarms. Some OEMs (Samsung, Xiaomi) treat "swipe away" as force-stop. WorkManager-based paths are also subject to Android 14's background work restrictions.
- **Current state in this fork:** Several notify-kit-style fixes already appear to exist locally:
  1. async receiver handoff / safe receiver finishing in alarm paths
  2. fallback when exact-alarm permission is denied
  3. `SCHEDULE_EXACT_ALARM` permission handling and reschedule-on-permission-change support
  4. BOOT_COUNT-based cold-start rescheduling
- **Comparison with `react-native-notify-kit`:**
  - Its README claims multiple concrete fixes for this area:
    1. missing `goAsync()` in the relevant broadcast path
    2. fallback when exact-alarm permission is denied
    3. AlarmManager as the default trigger backend instead of WorkManager
  - It also documents exact-alarm permissions and fallback behavior much more explicitly.
- **Gap in this fork:** The remaining gap is narrower than previously stated. The main unresolved part now looks like documentation, default-behavior clarity, and validation under real Android 14+/OEM kill scenarios rather than missing foundational alarm infrastructure.

#### `#766` Replace existing notification when using `createTriggerNotification`
- **Status:** Open. **Feature request**, not a bug.
- **Problem:** User needs to schedule two trigger notifications at the same time, where the second should replace the first if the first is still displayed. Using the same notification `id` causes the second to overwrite the first's schedule entirely.
- **Workaround:** Use different Notifee IDs for the two triggers. In an `onForegroundEvent`/`onBackgroundEvent` handler, when the second notification is delivered, cancel the first programmatically via `cancelDisplayedNotification()`. Alternatively, use `android.group` with the same group key for a grouped notification experience.
- **Action needed:** Consider adding an `android.displayId` or `android.replaceId` property that maps to the OS notification ID independently of the scheduling ID. Low priority.

### Android actions / foreground service

#### `#470` `startForegroundService()` not allowed due to Android background-start restrictions
- **Status:** Open. **OS-level constraint** — cannot be fully resolved at the library level. The crash-class symptom
  is fixed (see below); the restriction itself remains.
- **Problem:** When the app is killed and starts in headless mode to fire a notification as a Foreground Service, Android 12+ blocks the `startForegroundService()` call with `mAllowStartForeground false`.
- **Current state in this fork:** All `startForeground()` promotions (caller- and service-side, including retries and
  start-intent redeliveries) are guarded — a denial is caught, logged, and the service stops itself instead of
  crashing (see "Fixed via notify-kit parity" — notify-kit `#81`). The service still will not start in this
  situation; that part is an OS restriction.
- **Workaround:** Ensure FCM messages are sent as **high priority** (`priority: 'high'` in FCM payload) — Android exempts high-priority FCM from the background foreground service restriction. Set `asForegroundService: false` (loses styling). Declare the appropriate foreground service type in `AndroidManifest.xml` for Android 14+.
- **Action needed:** Document the Android 12+ foreground service restrictions and the high-priority FCM workaround prominently.

#### `#1078` Foreground service freezes when app dismissed
- **Status:** Open. **React Native architecture limitation.**
- **Problem:** `registerForegroundService` callback executes correctly while the app is foregrounded, but when the user dismisses the app to the background, execution freezes (e.g., `setInterval` stops firing). Android logs show `W IPCThreadState: Sending oneway calls to frozen process.`
- **Root cause:** The JavaScript execution context is tied to the Activity lifecycle. When the Activity is destroyed (app dismissed), the JS runtime freezes even though the foreground service process should remain alive. This is a React Native limitation, not purely a Notifee bug.
- **Workaround:** No confirmed workaround. Consider using native-only code for long-running foreground service work instead of JS callbacks.
- **Action needed:** Document the limitation. Consider providing a native-only foreground service API for use cases requiring persistent background execution.

### Test / integration coverage

#### `#1115` E2E tests in CI use core library from source vs packaged artifact
- **Status:** Open upstream. Partially improved in this fork.
- **Problem:** CI tests use the core library from source, which differs from the AAR artifact that consumers use. This mismatch means transitive dependency issues aren't caught pre-release.
- **Comparison with `react-native-notify-kit`:** Its README indicates it removed the packaged AAR distribution model entirely and now compiles the native core from source as part of the bridge module. That effectively sidesteps the exact source-vs-AAR mismatch tracked by `#1115`.
- **Gap in this fork:** If this fork keeps the current packaging model, it still needs explicit packaged-artifact CI coverage. Alternatively, it could adopt the same architectural simplification and remove the split distribution model.

#### `#1126` E2E test suite enhancements
- **Status:** Open upstream. Not started in this fork.
- **Problem:** Need a comprehensive test matrix covering all combinations of app state (Quit / Background / Foreground) × notification trigger state, verifying that pressing a notification correctly opens the app to the target screen.
- **Comparison with `react-native-notify-kit`:** Its README does not present this as a dedicated E2E matrix item, but it does document many of the exact lifecycle edge cases that such a matrix should cover, especially around iOS event routing, FCM ownership, exact alarms, reboot recovery, and foreground-service behavior.
- **Proposed 9-test matrix:**
  | | Trigger when App Quit | Trigger when App Background | Trigger when App Foreground |
  |---|---|---|---|
  | **Open via notification tap** | Quit→tap | Background→tap | Foreground→tap |
  | **Already in app** | — | Background, tap notification | Foreground, tap notification |
  | **Quit/reopen after notification** | Quit→open app | Background→open app | Foreground→open app |
- **Action needed:** Implement this test matrix in `tests_react_native/`. This would provide regression coverage for issues `#1279`, `#1128`, `#1076`, and `#870`, and would also let this fork validate or reject the stronger behavior claims made by `react-native-notify-kit`.

---

## Current fork-specific progress not directly tied to upstream issue closure

The fork has also made meaningful engineering progress that reduces noise and improves maintainability:

- Android test app now builds much further with modern Gradle/React Native setup
- Java toolchain handling was improved so Java 21 can be used without a hard JDK 17 toolchain requirement
- Multiple Gradle deprecation warnings were cleaned up
- Android manifest namespace/package warnings were reduced
- RN Firebase Android Gradle helper/plugin dependency was inlined locally where needed
- TurboModule/codegen overload collision was fixed
- Kotlin compile and deprecation issues in the Android module were cleaned up

These changes improve build reliability, but they do **not** by themselves close the remaining behavioral issues above.

---

## Updated recommended next priorities

1. ~~Revisit Android scheduling semantics for DST behavior~~ **Done** — `#875` fixed with `java.time` DST-aware scheduling
2. ~~Fix race condition in concurrent `createTriggerNotification`~~ **Done** — `#1283` fixed with awaited DB writes
3. ~~Fix iOS silent notification rejection~~ **Done** — `#826` fixed with default sound fallback and error reporting
4. ~~Port notify-kit shared-bug fixes~~ **Done (November 2026)** — `startForeground` guards, PendingIntent identity,
   headless actions on Android 12+, lazy TurboModule resolution, HeadlessTask stale context, `requestPermission`
   main-thread hop, Fresco bitmap copy, Android startup event buffer, initial-notification tap ledger
   (notify-kit `#81`, `#69`, `#38`, `#42`, `#39`, `#92`, 10.5.0, `#88`)
5. ~~Port cheapest notify-kit features~~ **Done (November 2026)** — `EventType.FG_TIMEOUT`,
   `getNotificationSettings().android.fullScreenIntent`, `shouldShowRequestPermissionRationale()`, explicit
   `pressAction: null` opt-out
6. **Validate and document behavior already present locally** — especially `#1076`, `#1128`, and `#1100`, where several notify-kit-style fixes already appear to exist in this fork
7. **Expand E2E coverage for lifecycle-heavy scenarios** — Implement the `#1126` test matrix to regress `#1279`, `#1128`, `#1076`, `#870`, and the new initial-notification ledger / startup event buffer
8. **Document FCM integration patterns** — Add prominent guide for data-only FCM messages, and consider whether a first-class FCM handling API is warranted
9. **Document iOS event-routing behavior precisely** — Address `#1076` confusion with explicit state-transition docs and validate current native routing with tests
10. **Close `#1041` as "by design"** — Add FAQ entry clarifying Notifee is a local notification library
11. **Document Android 12+/14+ restrictions** — Foreground service (`#470`, incl. the new `FG_TIMEOUT` event) and alarm (`#1100`) OS limitations
12. **Add packaged-artifact CI testing or remove the split packaging model** — Address `#1115` / `#1079`
13. **Revisit `#1078` foreground service JS freeze** — Investigate native-only foreground service API
14. **Optional larger-scope notify-kit features** — pre-emptive `dataSync` demotion (`FG_RUN_LIMIT_REACHED`), FCM
    payload extras, Server SDK, `init-nse` CLI, iOS rolling rebalance

---

## Bottom line

This fork has improved tooling, packaging, Expo support, and Android build reliability. It has now also fixed:

- The Android trigger scheduling race condition (`#1283`)
- DST drift in repeating notifications (`#875`)
- iOS silent notification rejection (`#826`)
- Improvements likely reduced the new architecture `onBackgroundEvent` inconsistency (`#870`), but this is not claimed as definitively closed here
- **(November 2026)** Every shared bug found in the notify-kit comparison (see "Fixed via notify-kit parity"):
  foreground-service `startForeground` denial crash, ReceiverService PendingIntent identity collision, Android 12+
  quick actions launching the app (`#877`), import-time TurboModule resolution, HeadlessTask stale React context,
  `requestPermission` threading, Fresco bitmap lifetime, Android startup event loss, and initial-notification
  replay after process death — plus the `FG_TIMEOUT`, `fullScreenIntent` setting, `shouldShowRequestPermissionRationale`
  and `pressAction: null` API surface

Cross-checking against `react-native-notify-kit` changes the picture in an important way:

- That fork claims a **broader and more opinionated fix set** than archived upstream.
- After comparing those claims against local code, several notify-kit-style fixes already appear to exist in this fork as well, especially around iOS event routing, Android initial-notification handling, exact-alarm fallback, and reboot/alarm recovery.
- That means some items previously described here as likely needing major library work are better understood as **verification, documentation, and regression-testing gaps**.
- Other items, especially `#1041`, still look fundamentally architectural/by-design even after that comparison.
- After the November 2026 parity batch, the clearest remaining product gap versus notify-kit is the larger-scope
  surface: Server SDK, `init-nse` CLI, FCM Mode payload extras, pre-emptive `dataSync` demotion, and iOS
  rolling-schedule rebalancing — plus the lack of explicit lifecycle documentation/tests proving current behavior.

The remaining open issues fall into clearer categories:

| Category | Issues | Path forward |
|----------|--------|-------------|
| **Mostly verification / documentation / test gaps** | `#1076`, `#1128`, `#1100` | Validate current behavior with targeted tests and document it clearly |
| **Likely solvable with additional library work** | `#1279`, `#1079`, `#1115` | Add FCM ownership guidance/API where appropriate and continue packaging/CI improvements |
| **Documentation/integration patterns** | `#1041` | Better docs, FAQ, close as by-design |
| **OS-level constraints** | `#470`, `#1078` | Document limitations and workarounds; consider native-only APIs where appropriate |
| **Feature requests** | `#766` | Low priority, workarounds available |
| **Testing infrastructure** | `#1126` | Add lifecycle-heavy E2E matrix to validate behavior claims |

This file should remain as an active status tracker and be updated as issues are closed, ported from maintained forks, or reclassified after direct code comparison.
