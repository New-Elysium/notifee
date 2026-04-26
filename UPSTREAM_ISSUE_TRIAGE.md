# Upstream Issue Triage — Current Status Summary

This file is a condensed status snapshot of upstream issues reviewed against the current fork.

## Resolved enough in this fork

These no longer look like active top-level problems:

- `#1121` Official Expo config plugin
  - This fork now ships an Expo config plugin and documents it.
- `#912` Notifee should not break React Native Firebase
  - There is now an explicit iOS config path to avoid interception behavior.
- `#880` Android `getInitialNotification` does not consume the notification
  - Current Android code consumes/removes the initial notification extras after reading them.
- `#877` Android quick action always requires device unlock on Android 12+
  - Current Android action handling uses a background receiver path for background-only actions.

## Partially addressed, but still worth tracking

These have meaningful improvements, but do not look fully closed:

- `#1128` Press notification data missing in some app states
  - Code appears improved, but cross-state parity is not strongly regression-tested.
- `#875` Scheduled notification fired at wrong time after DST / time change
  - Time-change rescheduling exists, but repeating timestamp semantics can still drift around DST.
- `#1079` Dependency locking / packaging reliability
  - The floating `+` concern has been improved, but packaged-artifact and locking validation still need stronger coverage.

## Still open / still structurally present

These still appear relevant in the current codebase:

### Lifecycle / event handling
- `#1279` `onBackgroundEvent` does not trigger when pressing push notification
- `#1076` iOS `onBackgroundEvent` PRESS / DISMISSED / DELIVERED issues
- `#1041` iOS foreground APNS notification listener behavior
- `#870` Android `onBackgroundEvent` vs `getInitialNotification` inconsistency

### Scheduling / trigger behavior
- `#1283` Android `createTriggerNotification` randomly executed
- `#1100` Android 14+ scheduled notifications not displayed when app is killed
- `#826` iOS `createTriggerNotification` fails with minimal/silent config
- `#766` Replace existing notification when using `createTriggerNotification`

### Android actions / foreground service
- `#470` `startForegroundService()` not allowed due to Android background-start restrictions
- `#1078` Foreground service freezes when app dismissed

### Test / integration coverage
- `#1115` E2E tests in CI use core library from source vs packaged artifact
- `#1126` E2E test suite enhancements

## Current fork-specific progress not directly tied to upstream issue closure

The fork has also made meaningful engineering progress that reduces noise and improves maintainability:

- Android test app now builds much further with modern Gradle/React Native setup
- Java toolchain handling was improved so Java 21 can be used without a hard JDK 17 toolchain requirement
- multiple Gradle deprecation warnings were cleaned up
- Android manifest namespace/package warnings were reduced
- RN Firebase Android Gradle helper/plugin dependency was inlined locally where needed
- TurboModule/codegen overload collision was fixed
- Kotlin compile and deprecation issues in the Android module were cleaned up

These changes improve build reliability, but they do **not** by themselves close the remaining behavioral issues above.

## Recommended next priorities

1. Unify notification open / press lifecycle behavior across foreground, background, and cold start
2. Expand E2E coverage for lifecycle-heavy scenarios
3. Revisit Android scheduling semantics for killed-app / exact-alarm / DST behavior
4. Revisit Android foreground-service behavior under modern OS restrictions
5. Add packaged-artifact integration coverage in CI alongside source integration

## Bottom line

This fork has improved tooling, packaging, Expo support, and Android build reliability.

However, several upstream behavioral issues still appear open, especially around:

- lifecycle/event ownership across app states
- Android scheduling reliability
- foreground-service restrictions
- integration test coverage

So this file should remain as a short status tracker rather than be deleted.