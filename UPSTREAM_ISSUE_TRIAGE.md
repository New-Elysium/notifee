# Upstream Issue Triage for `XChikuX/notifee`

Date: 2026-04-03

## Scope

This document reviews open issues from the upstream `invertase/notifee` repository and identifies which ones still look valid for this fork.

Assumptions used for triage:

- This fork primarily updated tooling, packaging, CI, and platform baselines.
- Core Android and iOS notification behavior appears largely inherited from upstream.
- Static review was performed against the code in this repository, plus the repository's own docs.
- Official Android and Apple platform documentation is linked where it is directly relevant to remediation or deeper investigation.

## Executive Summary

### Issues that still look valid here

These upstream issues still appear relevant to this fork:

- `#1283` `createTriggerNotification` randomly executed on Android
- `#1279` `onBackgroundEvent` does not trigger when pressing push notification
- `#1128` press notification data missing in some app states
- `#1126` e2e test suite enhancements
- `#1121` official Expo config plugin
- `#1115` e2e tests in CI use core library from source vs AAR
- `#1100` scheduled notifications not displayed when app is killed on Android 14+
- `#1079` dependency locking / `app.notifee:core:+`
- `#1078` foreground service freezes when app dismissed
- `#1076` iOS `onBackgroundEvent` PRESS / DISMISSED / DELIVERED issues
- `#1041` iOS foreground APNS notification not triggering listener
- `#912` Notifee intercepts React Native Firebase open handlers
- `#880` Android `getInitialNotification` does not consume the notification
- `#877` Android quick actions require device unlock on Android 12+
- `#875` Android scheduled notifications fire at wrong time after DST / time change
- `#870` Android 13 `onBackgroundEvent` vs `getInitialNotification` inconsistency
- `#826` iOS `createTriggerNotification` fails with minimal/silent config
- `#799` package does not contain a valid Expo config plugin
- `#766` replace existing notification when using `createTriggerNotification`
- `#470` `startForegroundService()` not allowed due to Android background-start restrictions

### Issues that do **not** need to be carried over as active problems

- `#1285` maintenance status: this fork is maintained and says so in `/home/runner/work/notifee/notifee/README.md`.
- `#1284` JitPack timeout: this fork is set up to use local core artifacts / source integration rather than only relying on remote JitPack resolution.
- `#1277` release notes missing: this fork includes `/home/runner/work/notifee/notifee/docs/react-native/release-notes.mdx`.
- `#1266` Expo gap analysis: useful discussion, but it is not an actionable defect by itself.

---

## High-level fast-forward plan

If the goal is to move from inherited legacy behavior toward a modern implementation, the highest-value aggregate changes are:

1. **Unify app-open / press event handling across Android and iOS**
   - Define one clear contract for foreground press, background press, quit-state open, action press, and dismiss events.
   - Remove ambiguity between `onBackgroundEvent`, `onForegroundEvent`, and `getInitialNotification`.
   - Add explicit test cases for foreground, background, killed, locked, and cold-start flows.

2. **Modernize Android scheduling semantics**
   - Audit exact alarm, idle, reboot, timezone-change, and DST behavior.
   - Prefer explicit rescheduling logic for repeating notifications after time changes.
   - Split “best effort background work” from “must fire at exact clock time” semantics.

3. **Modernize Android action delivery**
   - Revisit `PendingIntent.getActivities(...)` usage for quick actions.
   - Use broadcast/service pathways for actions that should not require device unlock or full activity launch.
   - Audit Android 12+ notification trampoline and foreground-service restrictions.

4. **Modernize iOS notification delegate integration**
   - Revisit how `UNUserNotificationCenter.currentNotificationCenter.delegate` is intercepted and chained.
   - Avoid long completion delays in `didReceiveNotificationResponse`.
   - Clarify behavior for remote notifications, trigger notifications, foreground presentation, and APNS integration.

5. **Fix Android packaging / integration assumptions**
   - Remove or pin `app.notifee:core:+`.
   - Make CI test both source-integration and packaged-artifact integration.
   - Treat dependency locking as a supported consumer scenario.

6. **Raise test coverage to match platform reality**
   - Expand E2E coverage to multi-API Android and multiple iOS versions.
   - Add scenario coverage for killed app, exact alarm permissions, DST/timezone changes, notification action unlock behavior, and React Native Firebase interop.

---

## Deep-dive by issue

## 1) Event lifecycle and app-open handling

### `#1279` ANDROID + IOS `onBackgroundEvent` does not trigger when pressing on push notification

**Why this still looks valid**

The core event plumbing still uses separate foreground/background/open pathways and there is still room for inconsistent behavior across app states.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/packages/react-native/src/NotifeeApiModule.ts`
- `/home/runner/work/notifee/notifee/packages/react-native/src/index.ts`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationReceiverHandler.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/Notifee.java`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m`
- `/home/runner/work/notifee/notifee/docs/react-native/events.mdx`

**Current evidence**

- The public docs still describe a split between background events and `getInitialNotification`: `/home/runner/work/notifee/notifee/docs/react-native/events.mdx`
- iOS still dispatches through `UNUserNotificationCenterDelegate` interception in `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m`.
- Android still relies on intent-based open handling and a separate initial-notification path in `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/Notifee.java`.

**Suggested fix**

- Define a state matrix and make each transition deterministic:
  - foreground press
  - background press
  - killed-state press
  - action press
  - dismiss
- Decide which mechanism is authoritative per platform:
  - Android: either always deliver a background event first, or always consume via app-open event for cold start.
  - iOS: prefer `UNUserNotificationCenterDelegate` callbacks for press/action handling and keep `getInitialNotification` only as compatibility behavior if needed.
- Add tests proving the contract for both local and remote notifications.

**Fast-forward modernization**

- Introduce a normalized internal event router that maps native callbacks into one platform-independent event model.
- Make `getInitialNotification` a compatibility shim instead of a competing source of truth.

**Relevant platform docs**

- Android notifications overview: <https://developer.android.com/develop/ui/views/notifications>
- Apple `UNUserNotificationCenterDelegate` response handling: <https://developer.apple.com/documentation/usernotifications/unusernotificationcenterdelegate>

---

### `#1128` ANDROID & IOS: press notification does not have data in quit state / foreground but has data in background

**Why this still looks valid**

Notification payload and press payload travel through different code paths depending on open state.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/Notifee.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationPendingIntent.java`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore.m`

**Current evidence**

- Android `getInitialNotification` can reconstruct from either a sticky event or current `Activity` intent extras: `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/Notifee.java:447-474`
- iOS stores `_initialNotification` from the notification response and returns it later: `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m:239-246`

**Suggested fix**

- Introduce a single “canonical payload shape” stored identically for:
  - live events
  - initial app-open data
  - action press data
- Serialize the same notification object and `pressAction` object into every path.
- Add regression tests for payload parity across foreground/background/killed states.

**Fast-forward modernization**

- Treat notification payload transport as a compatibility contract and version it internally.
- Stop reconstructing partial objects differently across platforms.

**Relevant platform docs**

- Apple local notification scheduling and payload behavior: <https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app>

---

### `#1076` iOS `onBackgroundEvent` PRESS / DISMISSED / DELIVERED does not work

**Why this still looks valid**

The current iOS delegate code has behavior that can easily cause gaps:

- `DELIVERED` for trigger notifications is only posted in `willPresentNotification`, which runs only while foregrounded.
- `DISMISSED` is only posted for dismiss action responses.
- `didReceiveNotificationResponse` delays completion by 15 seconds.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m:100-168`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m:175-255`
- `/home/runner/work/notifee/notifee/docs/react-native/events.mdx:121-129`

**Suggested fix**

- Reconcile the docs with the actual native event behavior.
- For iOS, clearly separate:
  - foreground presentation callback behavior
  - response callback behavior
  - background delivery limitations imposed by the OS
- Remove or justify the 15-second delayed completion; if not required, complete immediately after event dispatch.

**Fast-forward modernization**

- Make iOS event emission strictly delegate-driven and document unsupported events explicitly.
- Avoid completion delays that can interfere with app lifecycle handling.

**Relevant platform docs**

- Apple `userNotificationCenter(_:willPresent:withCompletionHandler:)`
- Apple `userNotificationCenter(_:didReceive:withCompletionHandler:)`
- Apple UserNotifications framework overview: <https://developer.apple.com/documentation/usernotifications>

---

### `#1041` iOS foreground APNS notification not triggering listener / not handled

**Why this still looks valid**

Foreground iOS handling currently special-cases notifications created “through notifee”. That can miss remote/APNS flows if the payload does not match the expected internal shape.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m:104-168`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+NSNotificationCenter.m`
- `/home/runner/work/notifee/notifee/docs/react-native/ios/remote-notification-support.mdx`
- `/home/runner/work/notifee/notifee/docs/react-native/integrations/fcm.mdx`

**Suggested fix**

- Audit remote notification flows separately from local-trigger flows.
- Ensure APNS / RNFirebase payloads are normalized into Notifee event payloads before routing.
- Add explicit foreground APNS test coverage on iOS for:
  - plain APNS
  - APNS with Notifee metadata
  - FCM-to-APNS bridged payloads

**Fast-forward modernization**

- Make remote-notification interop first-class instead of piggybacking on internal local-notification metadata.

**Relevant platform docs**

- Apple UserNotifications framework: <https://developer.apple.com/documentation/usernotifications>
- Apple Remote Notifications Programming Guide: <https://developer.apple.com/documentation/usernotifications/handling-notifications-and-notification-related-actions>

---

### `#912` Notifee should not break React Native Firebase

**Why this still looks valid**

The behavior is still documented as intentional in this fork’s own release notes.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/docs/react-native/release-notes.mdx:215-218`
- `/home/runner/work/notifee/notifee/docs/react-native/integrations/fcm.mdx`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore+UNUserNotificationCenter.m`

**Current evidence**

The docs still say:

> `onNotificationOpenedApp` and `getInitialNotification` from `RNFB Messaging` will no longer trigger as notifee will handle the event.

**Suggested fix**

- Add an explicit opt-in / opt-out interop mode.
- Default behavior should be conservative for shared integrations.
- Possible approach:
  - default to non-intercepting mode
  - allow `remoteHandling: 'notifee' | 'native' | 'rnfirebase-compatible'`

**Fast-forward modernization**

- Replace hard interception with a configurable event ownership policy.

**Relevant platform docs**

- Apple UserNotifications framework
- React Native Firebase Messaging docs: <https://rnfirebase.io/messaging/usage>

---

### `#880` Android `getInitialNotification` does not consume the notification

**Why this still looks valid**

The code still returns from current `Activity` intent extras without clearing them.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/Notifee.java:447-474`
- `/home/runner/work/notifee/notifee/docs/react-native/events.mdx:123-173`

**Current evidence**

`getInitialNotification`:

- first removes a sticky event
- else falls back to `activity.getIntent()`
- returns notification extras if present
- does not clear or mark those extras as consumed

**Suggested fix**

- After successful consumption from `Activity` intent, clear the relevant extra or replace the intent.
- Add tests for:
  - cold start consume once
  - reopen without re-delivery
  - process recreation after background eviction

**Fast-forward modernization**

- Introduce an internal one-time consumption token rather than relying on the current `Intent` state.

**Relevant platform docs**

- Android activity intents and task behavior: <https://developer.android.com/guide/components/activities/tasks-and-back-stack>

---

### `#870` Android 13 `onBackgroundEvent` vs `getInitialNotification`

**Why this still looks valid**

This is a symptom of the same split-source problem as `#1279` and `#880`.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/Notifee.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationReceiverActivity.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationReceiverHandler.java`

**Suggested fix**

- Collapse the Android app-open contract into one deterministic rule for modern Android.
- Document whether Android 13+ should always rely on `getInitialNotification` for cold starts.
- Add API-level regression tests.

**Fast-forward modernization**

- Align Android 13+ behavior to explicit lifecycle semantics rather than historical compatibility.

**Relevant platform docs**

- Android notifications and task/back stack docs.

---

## 2) Scheduling and trigger-notification behavior

### `#1283` Android `createTriggerNotification` randomly executed

**Why this still looks valid**

Trigger scheduling still moves through a mix of repository persistence, alarm manager scheduling, and work-manager-like flows.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/packages/react-native/src/NotifeeApiModule.ts`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationManager.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotifeeAlarmManager.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/database/WorkDataRepository.java`
- `/home/runner/work/notifee/notifee/docs/react-native/triggers.mdx`

**Suggested fix**

- Verify whether loss happens during:
  - validation
  - DB insert
  - alarm/work registration
  - reschedule / overwrite behavior
- Add stress tests that schedule many triggers and immediately query `getTriggerNotificationIds()`.
- Audit for ID collisions, update/replace semantics, and background persistence edge cases.

**Fast-forward modernization**

- Add an internal “scheduled state machine” with durable records and explicit status transitions.
- Prefer observable scheduling outcomes over fire-and-forget inserts.

**Relevant platform docs**

- Android alarm scheduling: <https://developer.android.com/develop/background-work/services/alarms>
- WorkManager: <https://developer.android.com/topic/libraries/architecture/workmanager>

---

### `#1100` Android 14+ scheduled notifications are not displayed when app is killed

**Why this still looks valid**

The scheduling stack still depends on alarm and background execution behavior that changed significantly on Android 12-14.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotifeeAlarmManager.java:147-214`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationAlarmReceiver.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/AlarmPermissionBroadcastReceiver.java`
- `/home/runner/work/notifee/notifee/docs/react-native/android/background-restrictions.mdx`

**Current evidence**

- The scheduler uses `AlarmManager` APIs directly.
- Exact alarm permission is checked on Android S+.
- There is still substantial platform-specific behavior to account for when apps are backgrounded or killed.

**Suggested fix**

- Split “exact clock alarms” from ordinary scheduled reminders.
- Add explicit checks and developer-visible diagnostics for:
  - exact alarm permission
  - battery optimization
  - OEM restrictions
  - app standby / idle mode
- Add Android 13 and Android 14 killed-app tests.

**Fast-forward modernization**

- Provide a modern scheduling strategy table:
  - exact user-visible alarm → exact alarm API
  - flexible reminder → WorkManager
  - repeat calendar reminder → reschedule on timezone/time change

**Relevant platform docs**

- Exact alarms and alarm scheduling: <https://developer.android.com/develop/background-work/services/alarms>
- Background restrictions: <https://developer.android.com/develop/background-work/background-tasks>

---

### `#875` scheduled notification fired at wrong time after DST / time change

**Why this still looks valid**

The current scheduling logic sets the next timestamp and schedules it, but there is no obvious DST/timezone-aware repeating policy in the alarm path.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotifeeAlarmManager.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/model/TimestampTriggerModel.java`
- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/RebootBroadcastReceiver.java`

**Suggested fix**

- Recompute repeating timestamps from wall-clock calendar semantics, not by carrying forward stale absolute timestamps.
- Reschedule on:
  - timezone change
  - time set
  - DST transition
  - reboot
- Add explicit tests around DST boundaries.

**Fast-forward modernization**

- Separate “calendar recurrence” from “interval recurrence” in the API and implementation.

**Relevant platform docs**

- Android `AlarmManager`
- Android background work / alarms docs

---

### `#826` iOS `createTriggerNotification` not working with minimal/silent configuration

**Why this still looks valid**

The content builder still handles sound and critical sound in a way that may implicitly assume fields that truly silent local notifications do not have.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCore.m:236-419`
- `/home/runner/work/notifee/notifee/ios/NotifeeCore/NotifeeCoreUtil.m`

**Current evidence**

- Trigger creation itself is straightforward.
- The main suspect is content construction / iOS scheduling acceptance for extremely minimal content.

**Suggested fix**

- Validate whether iOS rejects requests lacking user-visible content in the specific scenario.
- Distinguish between:
  - badge-only update
  - silent remote push behavior
  - local notification with minimal visible content
- Add unit/integration tests for badge-only trigger requests.

**Fast-forward modernization**

- Add explicit validation rules in JS and native code for unsupported local-trigger payload combinations.

**Relevant platform docs**

- Apple scheduling local notifications: <https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app>

---

### `#766` replace existing notification when using `createTriggerNotification`

**Why this still looks valid**

This is still an open feature gap. No first-class API exists to express “replace on delivery, but do not overwrite at schedule time”.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationManager.java`
- `/home/runner/work/notifee/notifee/packages/react-native/src/types/Notification.ts`
- `/home/runner/work/notifee/notifee/packages/react-native/src/types/Trigger.ts`

**Suggested fix**

- Introduce a separate delivery identity from scheduled-request identity.
- Example design:
  - `id`: scheduled request identity
  - `deliveryGroupKey` or `replaceOnDisplayId`: visible notification slot identity
- Preserve multiple scheduled reminders while replacing the displayed notification when one fires.

**Fast-forward modernization**

- Model scheduled notification identity and displayed-notification identity separately.

**Relevant platform docs**

- Android notification IDs and replacement semantics: <https://developer.android.com/develop/ui/views/notifications/build-notification>

---

## 3) Android action, unlock, and foreground-service issues

### `#877` Android quick action always requires device unlock on Android 12+

**Why this still looks valid**

The code still uses `PendingIntent.getActivities(...)` for action delivery.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/NotificationPendingIntent.java:42-92`
- `/home/runner/work/notifee/notifee/docs/react-native/android/interaction.mdx`

**Current evidence**

`NotificationPendingIntent.createIntent(...)` builds an activity stack and returns `PendingIntent.getActivities(...)`.

**Suggested fix**

- For actions that do **not** need UI launch, use a broadcast or service `PendingIntent` instead of an activity stack.
- Reserve activity-based pending intents for full notification opens or actions that intentionally open UI.
- Add API-level behavior tests for locked-device interaction.

**Fast-forward modernization**

- Split action models into:
  - background action
  - activity-launch action
  - inline reply action
- Make the native transport align to the action type.

**Relevant platform docs**

- Android notifications / action behavior: <https://developer.android.com/develop/ui/views/notifications>
- `PendingIntent` reference: <https://developer.android.com/reference/android/app/PendingIntent>

---

### `#470` Android `startForegroundService()` not allowed due to `mAllowStartForeground false`

**Why this still looks valid**

Foreground service startup still calls `startForegroundService(intent)` directly.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/ForegroundService.java:45-58`
- `/home/runner/work/notifee/notifee/docs/react-native/android/foreground-service.mdx`
- `/home/runner/work/notifee/notifee/docs/react-native/android/background-restrictions.mdx`

**Suggested fix**

- Audit every foreground-service start path against Android 12+ restrictions.
- Distinguish valid exemption cases from unsupported cases.
- Fail with actionable diagnostics when the OS forbids background start.
- Consider WorkManager expedited jobs or user-visible re-entry flows where full FGS start is not allowed.

**Fast-forward modernization**

- Bring Android FGS behavior in line with current Android 12-14 restrictions instead of assuming historical exemption behavior.

**Relevant platform docs**

- Android background-start restrictions for foreground services: <https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start>

---

### `#1078` foreground service freezes when app dismissed

**Why this still looks valid**

Foreground service coordination still depends on event bus behavior and app process state transitions.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/android/src/main/java/app/notifee/core/ForegroundService.java`
- `/home/runner/work/notifee/notifee/packages/react-native/src/NotifeeApiModule.ts`
- `/home/runner/work/notifee/notifee/docs/react-native/android/foreground-service.mdx`

**Suggested fix**

- Clarify whether the JS task is truly process-independent or still tied to app lifecycle assumptions.
- Add instrumentation tests for:
  - app foreground → background
  - app task dismissed
  - notification update loop continues or stops predictably
- Separate “ongoing system service notification” from “JS runtime task currently active”.

**Fast-forward modernization**

- Make FGS behavior native-first, with JS as a client, not as the sole executor.

**Relevant platform docs**

- Android foreground services docs
- Android process lifecycle docs

---

## 4) Build, packaging, Expo, and test gaps

### `#1079` dependency locking / `app.notifee:core:+`

**Why this still looks valid**

This fork still uses a floating local Maven version.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/packages/react-native/android/build.gradle:95-120`
- `/home/runner/work/notifee/notifee/android/build.gradle`
- `/home/runner/work/notifee/notifee/SDK55_MIGRATION.md`

**Current evidence**

`packages/react-native/android/build.gradle` still contains:

- `implementation(group: 'app.notifee', name:'core', version: '+')`
- local Maven repo injection via `url "$notifeeDir/android/libs"`

**Suggested fix**

- Replace `+` with a deterministic version.
- Publish / consume a generated local version matching the package version.
- Add a dependency-locking CI job.

**Fast-forward modernization**

- Treat Gradle dependency locking as a supported consumer workflow.
- Prefer composite builds or pinned artifacts over floating local Maven metadata.

**Relevant platform docs**

- Gradle dependency locking: <https://docs.gradle.org/current/userguide/dependency_locking.html>

---

### `#1115` e2e tests in CI use core library from source vs AAR

**Why this still looks valid**

The Android test app still includes `:notifee_core` from source.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/tests_react_native/android/settings.gradle:28-29`
- `/home/runner/work/notifee/notifee/.github/workflows/tests_e2e_android.yml`
- `/home/runner/work/notifee/notifee/.github/workflows/publish.yml`

**Suggested fix**

- Keep source integration for local developer ergonomics.
- Add a second CI mode that builds and consumes the packaged artifact path.
- Gate release readiness on packaged-artifact integration tests.

**Fast-forward modernization**

- Test both source and consumer integration paths, because they are materially different.

---

### `#1126` e2e test suite enhancements

**Why this still looks valid**

Current E2E workflows still show limited API coverage and CI workarounds.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/.github/workflows/tests_e2e_android.yml`
- `/home/runner/work/notifee/notifee/.github/workflows/tests_e2e_ios.yml`
- `/home/runner/work/notifee/notifee/tests_react_native`

**Current evidence**

- Android workflow has a TODO to broaden API coverage.
- iOS workflow has a TODO for broader simulator coverage.
- Both workflows overwrite `tests_react_native/index.js` from `index.test.js` in CI.

**Suggested fix**

- Add scenario-driven E2E suites for:
  - foreground / background / killed open
  - local vs remote notification presses
  - exact alarms
  - DST / timezone changes
  - quick actions while locked
  - foreground-service continuation
  - RNFirebase interop

**Fast-forward modernization**

- Treat notification state transitions as a formal test matrix, not ad hoc scenarios.

---

### `#1121` and `#799` Expo config plugin support

**Why these still look valid**

There is still no official config plugin shipped from the React Native package.

**Where to deep dive**

- `/home/runner/work/notifee/notifee/packages/react-native/package.json`
- `/home/runner/work/notifee/notifee/packages/react-native`
- `/home/runner/work/notifee/notifee/docs/react-native/installation.mdx`

**Suggested fix**

- Add an official Expo config plugin package or export.
- Cover at least:
  - Android icons
  - sounds
  - manifest changes / services / receivers
  - iOS entitlements / notification categories / sounds / extensions as applicable
- Add Expo sample app coverage.

**Fast-forward modernization**

- Make Expo integration a first-class supported path rather than relying on community plugins.

**Relevant platform docs**

- Expo config plugins: <https://docs.expo.dev/config-plugins/introduction/>

---

## 5) Additional notes on issues intentionally not carried over

### `#1284` Android build issue / JitPack timeout

This exact failure is less compelling in this fork because the repository now supports local core artifacts and source integration rather than only remote resolution.

Relevant files:

- `/home/runner/work/notifee/notifee/packages/react-native/android/build.gradle`
- `/home/runner/work/notifee/notifee/.github/workflows/publish.yml`

### `#1277` release notes missing

This appears addressed by:

- `/home/runner/work/notifee/notifee/docs/react-native/release-notes.mdx`
- `/home/runner/work/notifee/notifee/docs.json`

### `#1285` maintenance status

This fork is clearly presented as maintained in:

- `/home/runner/work/notifee/notifee/README.md`

---

## Platform documentation checklist

These are the platform docs most relevant to the carried-over issues and modernization work:

### Android

- Notifications overview: <https://developer.android.com/develop/ui/views/notifications>
- Build notifications: <https://developer.android.com/develop/ui/views/notifications/build-notification>
- Alarm scheduling / exact alarms: <https://developer.android.com/develop/background-work/services/alarms>
- Foreground service background-start restrictions: <https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start>
- WorkManager: <https://developer.android.com/topic/libraries/architecture/workmanager>
- PendingIntent reference: <https://developer.android.com/reference/android/app/PendingIntent>
- Tasks and back stack: <https://developer.android.com/guide/components/activities/tasks-and-back-stack>

### iOS

- UserNotifications framework: <https://developer.apple.com/documentation/usernotifications>
- Scheduling a local notification: <https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app>
- `UNUserNotificationCenterDelegate`: <https://developer.apple.com/documentation/usernotifications/unusernotificationcenterdelegate>
- Handling notifications and notification-related actions: <https://developer.apple.com/documentation/usernotifications/handling-notifications-and-notification-related-actions>

---

## Recommended implementation order

If these are going to be fixed rather than only tracked, the best order is:

1. **Android event-open consistency**
   - `#1279`, `#1128`, `#880`, `#870`
2. **iOS delegate / remote-notification consistency**
   - `#1076`, `#1041`, `#912`
3. **Android scheduling modernization**
   - `#1283`, `#1100`, `#875`
4. **Android action / FGS modernization**
   - `#877`, `#470`, `#1078`
5. **Packaging and integration reliability**
   - `#1079`, `#1115`
6. **Feature / ecosystem support**
   - `#766`, `#1121`, `#799`
7. **Testing expansion**
   - `#1126`

## Bottom line

This fork has modernized tooling, baselines, packaging, and docs, but the upstream product-level behavioral issues mostly still look present. The biggest technical debt clusters are:

- split event ownership across app states
- Android exact-alarm / background-execution behavior
- Android action transport built around activity pending intents
- iOS delegate interception complexity
- packaging assumptions around `app.notifee:core:+`
- insufficient lifecycle-heavy E2E coverage

If the goal is to make this fork materially better than upstream, the highest leverage work is to modernize native lifecycle handling first, then lock down behavior with a much more explicit integration test matrix.
