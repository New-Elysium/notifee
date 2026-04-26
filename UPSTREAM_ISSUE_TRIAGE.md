# Upstream Issue Triage — Current Status Summary

This file is a condensed status snapshot of upstream issues reviewed against the current fork.
All issues reference the archived `invertase/notifee` repository (archived April 7, 2026).
Status was verified via online research and codebase inspection in June 2025.

---

## Resolved enough in this fork

These no longer look like active top-level problems:

### `#1121` Official Expo config plugin
- This fork now ships an Expo config plugin and documents it.

### `#912` Notifee should not break React Native Firebase
- There is now an explicit iOS config path to avoid interception behavior.

### `#880` Android `getInitialNotification` does not consume the notification
- Current Android code consumes/removes the initial notification extras after reading them.

### `#877` Android quick action always requires device unlock on Android 12+
- Current Android action handling uses a background receiver path for background-only actions.

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

---

## Partially addressed, but still worth tracking

These have meaningful improvements, but do not look fully closed:

### `#1128` Press notification data missing in some app states
- **Status:** Open upstream. No fix in this fork.
- **Problem:** When pressing a notification, `detail.notification.data` is empty when the app is in the quit state or foreground, but works correctly in the background state. This specifically affects FCM + Notifee integration.
- **Root cause:** When FCM sends a notification with a `notification` payload (not data-only), the OS handles display natively. Notifee's event system never intercepts the press because the notification wasn't created via `notifee.displayNotification()`.
- **Workaround:** Send **data-only FCM messages** (no `notification` key in payload) and use `messaging().setBackgroundMessageHandler()` → `notifee.displayNotification()` to ensure Notifee owns the full lifecycle. For quit state, use `messaging().getInitialNotification()` as fallback.
- **Gap:** Cross-state parity is not regression-tested. An E2E test matrix (see `#1126`) would help verify data availability across all app states.

### `#1079` Dependency locking / packaging reliability
- **Status:** Open upstream. Partially improved in this fork.
- **Problem:** Build fails when Gradle dependency locking is enabled (Gradle 8+, which ships with RN 0.74+) because Notifee's local Maven repository uses a dynamic version (`app.notifee:core:+`) incompatible with dependency locking. Additionally, the local maven metadata XML triggers a legacy XML parser issue.
- **Improvement:** The fork's build system rework has improved packaging infrastructure. The inlined RN Firebase Gradle helper and modernized build tooling reduce the surface area for this class of issue.
- **Gap:** The specific Gradle 8 dependency locking issue with dynamic `core:+` version notation has not been explicitly verified as fixed. Testing with `resolutionStrategy.activateDependencyLocking()` enabled would confirm. Related to `#1115` (testing against packaged artifact vs source).

---

## Still open / still structurally present

These remain relevant in the current codebase. The original `invertase/notifee` repo is archived and will not address them.

### Lifecycle / event handling

#### `#1279` `onBackgroundEvent` does not trigger when pressing push notification
- **Status:** Open. Filed Dec 2025 against v9.x. No fix upstream or in fork.
- **Problem:** `notifee.onBackgroundEvent()` is not triggered when pressing a push notification while the app is in the background or quit state. Foreground handling works.
- **Root cause:** When FCM sends a notification with a `notification` payload, the OS handles display and tap natively. Notifee never gets the press event because it didn't create the notification. This is an architectural limitation of how FCM display notifications interact with Notifee's event system.
- **Workaround:** Send **data-only FCM messages** and use `messaging().setBackgroundMessageHandler()` → `notifee.displayNotification()`. For quit state, use `notifee.getInitialNotification()` as fallback.
- **Action needed:** This is fundamentally a documentation/integration pattern issue rather than a code bug. Consider adding a prominent integration guide for FCM + Notifee that explains the data-only message requirement.

#### `#1076` iOS `onBackgroundEvent` PRESS / DISMISSED / DELIVERED issues
- **Status:** Open. No fix upstream or in fork.
- **Problem:** On iOS, trigger notification press/dismissed/delivered events don't fire in `onBackgroundEvent`. Only `EventType.TRIGGER_NOTIFICATION_CREATED` (type 7) fires. Android works correctly.
- **Root cause:** iOS launches the app into the foreground when a notification is pressed, so press events appear in `onForegroundEvent` rather than `onBackgroundEvent`. This is an iOS platform behavior difference, not a bug.
- **Workaround:** Handle `EventType.PRESS` in both `onForegroundEvent` and `onBackgroundEvent` on iOS. Use `notifee.setNotificationCategories()` with proper `categoryId` configuration. Use `getInitialNotification()` as fallback for detecting which notification launched the app.
- **Action needed:** Documentation should clearly explain the iOS vs Android behavioral difference for event types across app states.

#### `#1041` iOS foreground APNS notification listener behavior
- **Status:** Open. **By design** — not a Notifee bug.
- **Problem:** APNS notifications sent directly (bypassing FCM) with `apns-push-type: background` do not trigger Notifee event handlers when the app is in the foreground.
- **Root cause:** Notifee is a **local notification library**. It only knows about notifications it creates via `displayNotification()` or `createTriggerNotification()`. Raw APNS payloads that bypass `notifee.displayNotification()` will never trigger Notifee event handlers. Additionally, `apns-push-type: background` causes iOS to suppress foreground presentation entirely.
- **Workaround:** Route through FCM → `messaging().onMessage()` → `notifee.displayNotification()`. Use `apns-push-type: alert` instead of `background` for foreground-presentation notifications. Set `foregroundPresentationOptions` with `banner: true, list: true, sound: true`.
- **Action needed:** Close with "won't fix" / "by design" label. Add FAQ entry clarifying that Notifee does not handle raw APNS notifications.

### Scheduling / trigger behavior

#### `#1100` Android 14+ scheduled notifications not displayed when app is killed
- **Status:** Open. Largely an OS-level constraint.
- **Problem:** On Android SDK 34 (Android 14), scheduled trigger notifications only display when the app is open/foregrounded. When the app is killed (swiped away), the notification never appears.
- **Root cause:** Android 14 has stricter background execution limits. Force-stopping an app cancels all `PendingIntent`-based alarms. Some OEMs (Samsung, Xiaomi) treat "swipe away" as force-stop. WorkManager-based paths are also subject to Android 14's background work restrictions.
- **Workaround:** Ensure `alarmManager: true` is set in trigger config. Request `SCHEDULE_EXACT_ALARM` permission from the user (Android 12+). Disable battery optimization for the app. Consider `foregroundServiceType: "shortService"` for critical notifications.
- **Action needed:** Document Android 14+ limitations and required permissions clearly. Consider adding a runtime check that warns when `SCHEDULE_EXACT_ALARM` permission is not granted on Android 12+.

#### `#766` Replace existing notification when using `createTriggerNotification`
- **Status:** Open. **Feature request**, not a bug.
- **Problem:** User needs to schedule two trigger notifications at the same time, where the second should replace the first if the first is still displayed. Using the same notification `id` causes the second to overwrite the first's schedule entirely.
- **Workaround:** Use different Notifee IDs for the two triggers. In an `onForegroundEvent`/`onBackgroundEvent` handler, when the second notification is delivered, cancel the first programmatically via `cancelDisplayedNotification()`. Alternatively, use `android.group` with the same group key for a grouped notification experience.
- **Action needed:** Consider adding an `android.displayId` or `android.replaceId` property that maps to the OS notification ID independently of the scheduling ID. Low priority.

### Android actions / foreground service

#### `#470` `startForegroundService()` not allowed due to Android background-start restrictions
- **Status:** Open. **OS-level constraint** — cannot be fully resolved at the library level.
- **Problem:** When the app is killed and starts in headless mode to fire a notification as a Foreground Service, Android 12+ blocks the `startForegroundService()` call with `mAllowStartForeground false`.
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
- **Status:** Open. Partially improved in this fork.
- **Problem:** CI tests use the core library from source, which differs from the AAR artifact that consumers use. This mismatch means transitive dependency issues aren't caught pre-release.
- **Action needed:** Add a CI job that builds the AAR first, then runs E2E tests against the packaged artifact. Alternatively, use a Gradle copy task to eliminate the core/module split entirely.

#### `#1126` E2E test suite enhancements
- **Status:** Open. Not started.
- **Problem:** Need a comprehensive test matrix covering all combinations of app state (Quit / Background / Foreground) × notification trigger state, verifying that pressing a notification correctly opens the app to the target screen.
- **Proposed 9-test matrix:**
  | | Trigger when App Quit | Trigger when App Background | Trigger when App Foreground |
  |---|---|---|---|
  | **Open via notification tap** | Quit→tap | Background→tap | Foreground→tap |
  | **Already in app** | — | Background, tap notification | Foreground, tap notification |
  | **Quit/reopen after notification** | Quit→open app | Background→open app | Foreground→open app |
- **Action needed:** Implement this test matrix in `tests_react_native/`. This would provide regression coverage for issues `#1279`, `#1128`, `#1076`, and `#870`.

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
4. **Expand E2E coverage for lifecycle-heavy scenarios** — Implement the `#1126` test matrix to regress `#1279`, `#1128`, `#1076`, `#870`
5. **Document FCM integration patterns** — Add prominent guide for data-only FCM messages to address `#1279`, `#1128`
6. **Document iOS vs Android event behavior differences** — Address `#1076` confusion with clear state-transition docs
7. **Close `#1041` as "by design"** — Add FAQ entry clarifying Notifee is a local notification library
8. **Document Android 12+/14+ restrictions** — Foreground service (`#470`) and alarm (`#1100`) OS limitations
9. **Add packaged-artifact CI testing** — Address `#1115` by testing against AAR in CI
10. **Revisit `#1078` foreground service JS freeze** — Investigate native-only foreground service API

---

## Bottom line

This fork has improved tooling, packaging, Expo support, and Android build reliability. It has now also fixed:

- The Android trigger scheduling race condition (`#1283`)
- DST drift in repeating notifications (`#875`)
- iOS silent notification rejection (`#826`)
- Improvements likely reduced the new architecture `onBackgroundEvent` inconsistency (`#870`), but this is not claimed as definitively closed here

The remaining open issues fall into clear categories:

| Category | Issues | Path forward |
|----------|--------|-------------|
| **Documentation/integration patterns** | `#1279`, `#1128`, `#1041` | Better docs, FAQ, close `#1041` as by-design |
| **iOS platform behavior** | `#1076` | Document iOS vs Android event differences |
| **OS-level constraints** | `#470`, `#1078`, `#1100` | Document limitations and workarounds |
| **Feature requests** | `#766` | Low priority, workarounds available |
| **Testing infrastructure** | `#1115`, `#1126` | CI improvements and test matrix |
| **Build/packaging** | `#1079` | Verify with dependency locking enabled |

This file should remain as an active status tracker and be updated as issues are closed or new ones are discovered.