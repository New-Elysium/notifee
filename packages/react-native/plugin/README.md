# `@psync/notifee` Expo config plugin

This directory contains the official [Expo config plugin](../README.md#expo-config-plugin)
for `expo prebuild`. It wires up everything Notifee needs natively:

- **Android** — notification icons (`androidIcons`, `androidNotificationIcon`), sounds
  (`androidSoundFiles`), the FCM default notification icon metadata, and the notification
  color resource.
- **iOS** — APS environment mode, background modes, communication-notification
  entitlement, notification sounds, and an optional Notification Service Extension
  target (with App Group entitlements and EAS `appExtensions` registration).

The entry point is `withNotifee.js`; `android.js` / `ios.js` implement the platform
mods, `utils.js` normalizes and validates options, and `constants.js` holds the
defaults. `test-*.js` files are Jest tests.

User-facing documentation — all supported options, defaults, migration notes from
`expo-notifications`, and troubleshooting — lives in the
[Expo config plugin section of the package README](../README.md#expo-config-plugin).
