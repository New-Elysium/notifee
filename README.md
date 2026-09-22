<p align="center">
  <a href="https://psync.club">
    <img width="150px" src="https://psync.club/favicon.ico"><br/>
  </a>
  <a href="https://notifee.app">
    <img width="50px" src="https://notifee.app/logo-icon.png"><br/>
  </a>
  <h2 align="center">Notifee - React Native</h2>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@psync/notifee"><img src="https://img.shields.io/npm/v/@psync/notifee?label=npm&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@psync/notifee"><img src="https://img.shields.io/npm/dm/@psync/notifee?label=downloads" alt="npm downloads"></a>
  <a href="https://github.com/New-Elysium/notifee/actions"><img src="https://img.shields.io/github/actions/workflow/status/New-Elysium/notifee/linting.yml?branch=main" alt="CI status"></a>
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey" alt="platforms">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="license"></a>
</p>

---

> ⚠️ **New Architecture Only**: This version of Notifee is built **exclusively for React Native New Architecture**. It requires React Native 0.83+ with the New Architecture enabled. For the legacy architecture, use the [`@invertase/notifee`](https://www.npmjs.com/package/@invertase/notifee) package.

A feature-rich Android & iOS notifications library for React Native — fully typed, with rich native UI, scheduling, interactive actions, and first-class Expo support.

[> Learn More](https://notifee.app/)
[> Get Started](https://notifee.app/react-native/docs/overview)
[> GitHub](https://github.com/New-Elysium/notifee)
[> Join the Club](https://psync.club)

## Table of Contents

- [Features](#features)
- [Platform Requirements](#platform-requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Android 16 ongoing progress notifications](#android-16-ongoing-progress-notifications)
- [Expo Support](#expo-support)
- [Integrations (FCM, OneSignal)](#integrations-fcm-onesignal)
- [Testing](#testing)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

Notifee exposes one consistent, fully typed JavaScript API that maps to deep native notification capabilities on both platforms:

- **Rich notifications** — titles, subtitles, body, large icons, big pictures, expandable text, and message conversations (`styles`). ([Android](https://notifee.app/react-native/docs/android/styles) · [iOS](https://notifee.app/react-native/docs/ios/appearance))
- **Channels & groups (Android) / Categories (iOS)** — organized, user-controllable notification routing with importance, sounds, and action buttons.
- **Interactive actions** — reply inputs, quick actions, and press/dismiss handling in the foreground and background. ([Android](https://notifee.app/react-native/docs/android/interaction) · [iOS](https://notifee.app/react-native/docs/ios/interaction))
- **Scheduling & triggers** — display notifications at a time, on an interval, or at a location using `createTriggerNotification`. ([Triggers](https://notifee.app/react-native/docs/triggers))
- **Foreground services (Android)** — long-running tasks with a prominent, ongoing notification and action controls. ([Guide](https://notifee.app/react-native/docs/android/foreground-service))
- **Progress indicators** — linear and segmented progress (incl. Android 16 promoted ongoing notifications), timers, and live-updating bars. ([Android](https://notifee.app/react-native/docs/android/progress-indicators))
- **Behaviour control** — sound, vibration, lights, visibility/lock-screen, critical alerts (iOS), and more. ([Android](https://notifee.app/react-native/docs/android/behaviour) · [iOS](https://notifee.app/react-native/docs/ios/behaviour))
- **Badges (iOS)** — get, set, increment, and decrement the app badge count. ([Guide](https://notifee.app/react-native/docs/ios/badges))
- **Permissions & settings** — request permission, read current settings, and deep-link to system notification / alarm / battery-optimization settings. ([Android](https://notifee.app/react-native/docs/android/permissions) · [iOS](https://notifee.app/react-native/docs/ios/permissions))
- **Remote notifications** — first-class FCM and OneSignal interop, plus a Notification Service Extension helper for iOS rich/modified payloads. ([Integrations](#integrations-fcm-onesignal))
- **Battery & power management (Android)** — detect battery optimization, open the relevant settings screens, and query `PowerManager` info.
- **Events** — subscribe to foreground and background notification events (`PRESS`, `DISMISSED`, `DELIVERED`, `TRIGGER_NOTIFICATION_CREATED`, channel/group changes, etc.). ([Events](https://notifee.app/react-native/docs/events))
- **Expo config plugin** — native setup via `expo prebuild` (icons, sounds, service extension, background modes, app groups). ([Expo Support](#expo-support))
- **Testing** — ships a Jest mock (`@psync/notifee/jest-mock`) and a Detox payload helper. ([Testing](#testing))

## Platform Requirements

| Requirement           | Minimum Version                |
| --------------------- | ------------------------------ |
| React Native          | 0.83+ (New Architecture only!) |
| iOS Deployment Target | 15.1+                          |
| Android minSdk        | 28+                            |
| Android SDK setup     | compileSdk 36+, targetSdk 35+  |
| Xcode                 | 16.2+ (for iOS development)    |

## Installation

Install with your package manager of choice:

```bash
# npm
npm install @psync/notifee

# yarn
yarn add @psync/notifee

# bun
bun add @psync/notifee
```

### Native setup (bare React Native)

- **iOS**: install pods from your `ios/` directory:
  ```bash
  cd ios && pod install
  ```
- **Android**: no additional steps are required beyond the SDK levels above. Add your notification icons/sounds as native resources as needed.

### Expo

If you use Expo, do **not** run the bare steps above — add the [config plugin](#expo-support) and run `expo prebuild`.

### Remote notifications (optional)

Notifee does not bundle a push provider. To handle FCM or OneSignal messages, see [Integrations](#integrations-fcm-onesignal).

## Quick Start

A minimal flow: ask for permission, create an Android channel, display a notification, and listen for interactions.

```js
import notifee, { EventType, AndroidImportance } from '@psync/notifee';
import { PermissionsAndroid, Platform } from 'react-native';

// 1. Prepare the platform: permission on iOS, a channel on Android.
async function setupNotifications() {
  if (Platform.OS === 'ios') {
    await notifee.requestPermission();
  } else {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
    // Also recommended for correct status-bar icon color on Android 8.0+
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }
}

// 2. Display a notification.
async function notify() {
  await setupNotifications();
  await notifee.displayNotification({
    title: 'Hello from Notifee 👋',
    body: 'One API for rich notifications on Android & iOS.',
    android: {
      channelId: 'default',
      smallIcon: 'ic_launcher', // your generated icon name
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
    },
  });
}

// 3. React to user interaction.
notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.PRESS) {
    console.log('User pressed the notification', detail.notification);
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DISMISSED) {
    // Update remote state, analytics, etc.
    console.log('User dismissed', detail.notification?.id);
  }
});
```

See the [Usage guide](https://notifee.app/react-native/docs/usage) for channels, triggers, styles, and more.

## Documentation

- [Overview](https://notifee.app/react-native/docs/overview)
- [Usage](https://notifee.app/react-native/docs/usage)
- [Displaying a notification](https://notifee.app/react-native/docs/displaying-a-notification)
- [Triggers](https://notifee.app/react-native/docs/triggers)
- [Events](https://notifee.app/react-native/docs/events)
- [Reference (full API)](https://notifee.app/react-native/reference)

### Platform guides

| Android                                                                                                | iOS                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [Appearance](https://notifee.app/react-native/docs/android/appearance)                                | [Appearance](https://notifee.app/react-native/docs/ios/appearance)                   |
| [Behaviour](https://notifee.app/react-native/docs/android/behaviour)                                  | [Behaviour](https://notifee.app/react-native/docs/ios/behaviour)                     |
| [Channels & Groups](https://notifee.app/react-native/docs/android/channels)                          | [Categories](https://notifee.app/react-native/docs/ios/categories)                   |
| [Foreground Service](https://notifee.app/react-native/docs/android/foreground-service)               | [Interaction](https://notifee.app/react-native/docs/ios/interaction)                |
| [Grouping & Sorting](https://notifee.app/react-native/docs/android/grouping-and-sorting)             | [Permissions](https://notifee.app/react-native/docs/ios/permissions)                |
| [Interaction](https://notifee.app/react-native/docs/android/interaction)                             | [Badges](https://notifee.app/react-native/docs/ios/badges)                           |
| [Progress Indicators](https://notifee.app/react-native/docs/android/progress-indicators)             | [Remote Notification Support](https://notifee.app/react-native/docs/ios/remote-notification-support) |
| [Styles](https://notifee.app/react-native/docs/android/styles)                                        |                                                                                      |
| [Timers](https://notifee.app/react-native/docs/android/timers)                                        |                                                                                      |
| [Permissions](https://notifee.app/react-native/docs/android/permissions)                              |                                                                                      |
| [Background Restrictions](https://notifee.app/react-native/docs/android/background-restrictions)     |                                                                                      |

## Android 16 ongoing progress notifications

Notifee now supports Android 16's promoted ongoing notification APIs:

- `android.promotedOngoing`
- `android.shortCriticalText`
- segmented `android.progress` via `segments`, `points`, `styledByProgress`, and `trackerIcon`

```js
await notifee.displayNotification({
  title: 'Continue on BR-116',
  subtitle: '2 km',
  android: {
    ongoing: true,
    promotedOngoing: true,
    shortCriticalText: '2 km',
    progress: {
      current: 456,
      segments: [
        { length: 41, color: '#2f2f2f' },
        { length: 552, color: '#f4a261' },
        { length: 253, color: '#f4a261' },
        { length: 94, color: '#55a630' },
      ],
      points: [{ position: 60, color: '#e63946' }],
      styledByProgress: false,
      trackerIcon: 'ic_navigation_car',
    },
  },
});
```

Notes:

- `progress.segments` is Android 16+ only and becomes the source of truth for total progress length.
- `progress.max` cannot be combined with `progress.segments`.
- `android.style` cannot be combined with segmented progress, because Android's `ProgressStyle` occupies the notification style slot.
- On older Android versions, segmented progress falls back to the existing linear progress bar using the summed segment length as `max`.

## Expo Support

`@psync/notifee` ships an official Expo config plugin for `expo prebuild`. Pair it with `expo-build-properties` when you need to align the main app's Android SDK levels or iOS deployment target:

```js
export default {
  expo: {
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: '36.0.0',
          },
          ios: {
            deploymentTarget: '15.1',
          },
        },
      ],
      [
        '@psync/notifee',
        {
          androidIcons: [
            {
              name: 'ic_stat_notify',
              path: './assets/notifications/ic_stat_notify.png',
              type: 'small',
            },
          ],
          androidSoundFiles: [
            {
              name: 'message_chime',
              path: './assets/notifications/message_chime.mp3',
            },
          ],
          androidNotificationColor: '#ffffff',
          androidNotificationIcon: './assets/notifications/ic_notification.png',
          backgroundModes: ['remote-notification'],
          enableNotificationServiceExtension: true,
          iosSoundFiles: ['./assets/notifications/chime.wav'],
        },
      ],
    ],
  },
};
```

The plugin only applies the native changes you opt into. It does not add iOS background modes unless you set `backgroundModes`, and when `iosSoundFiles` plus `enableNotificationServiceExtension` are both set it wires those files into the app and extension during the same prebuild. Android sound files are packaged separately through `androidSoundFiles`, because Android accepts a broader range of audio formats than iOS notification sounds do.

`androidNotificationColor` writes the `notification_icon_color` color resource into `android/app/src/main/res/values/colors.xml` — the same resource name `expo-notifications` used to generate. Reference it from manifest metadata such as `com.google.firebase.messaging.default_notification_color` with `@color/notification_icon_color`. If `expo-notifications` is also installed, list `@psync/notifee` after it in the `plugins` array so this value takes precedence.

`androidNotificationIcon` is required for correct icon display on Android 8.0+. It generates the `notification_icon` drawable (24–96 px, all densities) and wires the `com.google.firebase.messaging.default_notification_icon` manifest metadata to `@drawable/notification_icon`, which FCM uses for notifications displayed while the app is backgrounded or killed. Use a transparent, monochrome (alpha-only) PNG — opaque or colored icons render as a white block in the status bar. The source asset should be square.

**Migrating from `expo-notifications` / the `notification` config property:** Expo SDK 55+ rejects the top-level `notification` property in app config when `expo-notifications` is not installed — remove the property from your app config. Then map your configuration to the plugin options: `notification.color` → `androidNotificationColor`, `notification.icon` → `androidNotificationIcon`, and notification sounds → `androidSoundFiles` / `iosSoundFiles`. For local notifications built with notifee, also set `android.smallIcon: 'notification_icon'` (or another generated icon name) in your notification payloads.

**iOS App Groups & EAS:** when the Notification Service Extension is enabled, the plugin injects an App Group entitlement (`group.<bundle.id>` by default). EAS only registers groups declared in app config `ios.entitlements` and syncs credentials before prebuild — declare the group there or the iOS build fails with a provisioning profile mismatch (prebuild warns when it is missing). See the [package README](./packages/react-native/README.md#ios-app-groups--eas-builds) for details.

See the [package README](./packages/react-native/README.md#expo-config-plugin) for the full list of supported plugin options.

## Integrations (FCM, OneSignal)

Notifee focuses on rendering and managing notifications; delivering remote messages is handled by your push provider. It provides native interop so you can bridge incoming payloads into Notifee:

- **Firebase Cloud Messaging (FCM)** — use `notifee.handleFcmMessage(remoteMessage)` to convert an FCM data/notification message into a Notifee display, and `setFcmConfig({ ... })` to configure a default channel, press action, and fallback behavior. See the [FCM integration guide](https://notifee.app/react-native/integrations/fcm).
- **OneSignal** — render OneSignal payloads with Notifee via the [OneSignal integration guide](https://notifee.app/react-native/integrations/onesignal).

For iOS rich/modified payloads (e.g. decrypting or rewriting content before display), enable the Notification Service Extension through the Expo plugin (`enableNotificationServiceExtension`) or add `RNNotifeeCore` to your native iOS target and call `NotifeeExtensionHelper`. The Expo plugin wires this up for you during `expo prebuild`. See [iOS Remote Notification Support](https://notifee.app/react-native/docs/ios/remote-notification-support).

## Testing

### Jest

Notifee ships a mock so you can unit-test components that call the API without a native runtime:

```js
// jest.config.js
setupFiles: ['<rootDir>/jest.setup.js'],
transformIgnorePatterns: [
  'node_modules/(?!(jest-)?react-native|@react-native|@psync/notifee)',
],
```

```js
// jest.setup.js
jest.mock('@psync/notifee', () => require('@psync/notifee/jest-mock'));
```

If you forget to mock the native module, tests fail with:

```text
Notifee native module not found.
```

### Detox

To mock a local notification and trigger Notifee's event handlers in Detox, send a payload with a `__notifee_notification` key:

```js
{
  title: 'test',
  body: 'Body',
  payload: {
    __notifee_notification: {
      ios: {
        foregroundPresentationOptions: {
          banner: true,
          list: true,
        },
      },
      data: {},
    },
  },
}
```

The important part is a `__notifee_notification` object under `payload` with the default properties.

**Note**: Firebase Dynamic Links has been deprecated and removed. Migrate to Universal Links (iOS) and App Links (Android) for deep linking functionality.

## Development

This is a monorepo managed with [Bun](https://bun.sh) workspaces. See [AGENTS.md](./AGENTS.md) for detailed development instructions.

```bash
# Clone and install (also builds the RN package via the prepare step)
git clone https://github.com/New-Elysium/notifee.git
cd notifee
bun install

# Build everything (RN package + core Android/iOS)
bun run build

# Run unit tests (Jest) and Android JUnit tests
bun run test
bun run test:android
```

### Recommended scripts

```bash
# Build the RN package (TypeScript -> dist/) and core native libraries
bun run build:rn
bun run build:core

# Type-check, lint, and format
bun run typecheck
bun run lint
bun run format

# Example smoke-test app (lives OUTSIDE the Bun workspace, npm-managed)
bun run smoke:setup    # first time: build RN package, then npm install + pod install for example/
bun run smoke:ios      # run the smoke app on the iOS simulator
bun run smoke:android  # run the smoke app on Android

# End-to-end suite (Cavy + Jest in tests_react_native/)
bun run e2e:android
bun run e2e:ios
```

> The `example/` smoke-test app manages its own dependencies with **npm** (not Bun) to avoid Metro/Bun symlink issues. Use `bun run smoke:setup` rather than installing it manually.

### Native build notes

- **Android**: `bun run build:core:android` publishes the AAR into the RN package via Gradle.
- **iOS**: `bun run build:core:ios` copies `NotifeeCore` into `packages/react-native/ios`.

## Contributing

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (required for semantic-release versioning).
- CI runs lint, TypeScript, formatting, Jest, and Android JUnit checks on every PR.

## License

Released under the [Apache-2.0](./LICENSE) license.

---

<p>
  <img align="left" width="50px" src="https://psync.club/favicon.ico">
  <p align="left">
    Originally built by <a href="https://invertase.io">Invertase</a> and maintained with 💖 by <a href="https://psync.club">Psync</a>.
  </p>
</p>
