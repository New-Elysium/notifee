<p align="center">
  <a href="https://psync.club">
    <img width="150px" src="https://psync.club/favicon.ico"><br/>
  </a>
  <a href="https://notifee.app">
    <img width="50px" src="https://notifee.app/logo-icon.png"><br/>
  </a>
  <h2 align="center">Notifee - React Native</h2>
</p>

---

> ⚠️ **New Architecture Only**: This version of Notifee is built **exclusively for React Native New Architecture**. It requires React Native 0.83+ with the New Architecture enabled. For the legacy architecture, use the @invertase/notifee package.

A feature rich Android & iOS notifications library for React Native.

[> Learn More](https://notifee.app/)
[> Get Started](https://notifee.app/react-native/docs/overview)
[> GitHub](https://github.com/New-Elysium/notifee)
[> Join the Club](https://psync.club)

## Platform Requirements

| Requirement           | Minimum Version                |
| --------------------- | ------------------------------ |
| React Native          | 0.83+ (New Architecture only!) |
| iOS Deployment Target | 15.1+                          |
| Android minSdk        | 28+                            |
| Android SDK setup     | compileSdk 36+, targetSdk 35+  |
| Xcode                 | 16.2+ (for iOS development)    |

## Installation

```bash
npm install @psync/notifee
```

```bash
yarn add @psync/notifee
```

```bash
bun add @psync/notifee
```

### Expo config plugin

`@psync/notifee` now ships an official Expo config plugin for `expo prebuild`.

Add it to your Expo config. When you need to align the main app target with Notifee's native requirements, pair it with `expo-build-properties`:

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
          backgroundModes: ['remote-notification'],
          enableNotificationServiceExtension: true,
          iosSoundFiles: ['./assets/notifications/chime.wav'],
        },
      ],
    ],
  },
};
```

Supported plugin options:

- `apsEnvMode?: 'development' | 'production'`
- `backgroundModes?: string[]`
- `enableCommunicationNotifications?: boolean`
- `androidIcons?: Array<{ name: string; path: string; type: 'small' | 'large' }>`
- `androidSoundFiles?: Array<{ name: string; path: string }>`
- `androidNotificationColor?: string` — hex color (e.g. `'#ffffff'`). Writes the `notification_icon_color` resource into `values/colors.xml`, the same resource name `expo-notifications` generated, so FCM manifest metadata like `com.google.firebase.messaging.default_notification_color` keeps resolving after removing `expo-notifications`.
- `androidNotificationIcon?: string` — path to a transparent, monochrome (alpha-only) square PNG. Required for correct icon display on Android 8.0+. Generates the `notification_icon` drawable (24–96 px) and sets the `com.google.firebase.messaging.default_notification_icon` metadata to `@drawable/notification_icon` (existing same-name metadata is updated in place, so custom Firebase config plugins remain in control of ordering).
- Migrating from `expo-notifications`: remove the top-level `notification` property from your app config (Expo SDK 55+ fails prebuild when it exists and `expo-notifications` is not installed) and map values to the plugin options — `notification.color` → `androidNotificationColor`, `notification.icon` → `androidNotificationIcon`, `sounds` → `androidSoundFiles` / `iosSoundFiles`. For local notifications, set `android.smallIcon: 'notification_icon'` in your notification payloads.
- `iosSoundFiles?: string[]`
- `enableNotificationServiceExtension?: boolean`
- `serviceExtensionSettings?: { name?: string; bundleIdentifier?: string; deploymentTarget?: string; appGroupName?: string; customSourceFilePath?: string; entitlements?: Record<string, unknown>; infoPlist?: Record<string, unknown> }`
- `appleDevTeamId?: string`
- `verbose?: boolean`

Notes:

- `apsEnvMode` is optional and usually unnecessary if your project already uses the `expo-notifications` plugin or you manage `expo.ios.entitlements['aps-environment']` yourself.
- `backgroundModes` is opt-in. The plugin does not add `remote-notification` unless you set it.
- `androidSoundFiles` copies local files into `android/app/src/main/res/raw`. At runtime, reference the resource name you configured, for example `sound: 'message_chime'`.
- Android accepts a broader range of notification sound containers than iOS. In practice, `.mp3`, `.wav`, and `.ogg` are the most predictable Android choices, while iOS notification sounds must remain `.wav`, `.aif`, `.aiff`, or `.caf`.
- The extension is enabled with the top-level `enableNotificationServiceExtension` option. Additional settings live under `serviceExtensionSettings`; the former `notificationServiceExtension` object (including its `enabled` key) is no longer accepted.
- `serviceExtensionSettings.deploymentTarget` only changes the generated Notification Service Extension target. Set the main app deployment target with `expo-build-properties` or your native project settings.
- `appleDevTeamId` is usually unnecessary if `expo.ios.appleTeamId` is already set in your Expo config.
- Flat legacy aliases remain supported for backward compatibility: `notificationServiceExtensionName`, `notificationServiceExtensionBundleIdentifier`, `iosDeploymentTarget`, `customNotificationServiceFilePath`, `appGroupName`, `notificationServiceExtensionEntitlements`, and `notificationServiceExtensionInfoPlist`.

When the notification service extension is enabled (`enableNotificationServiceExtension: true`), the plugin will:

- create an iOS Notification Service Extension target,
- add the required `RNNotifeeCore` Podfile target with `$NotifeeExtension = true`,
- generate a default `NotificationService.m` that calls `NotifeeExtensionHelper`,
- add application-group entitlements for the app and extension, and
- register the extension in `expo.extra.eas.build.experimental.ios.appExtensions`.

When `iosSoundFiles` is set, the plugin will copy supported iOS notification sound assets (`.wav`, `.aif`, `.aiff`, `.caf`) into the generated native iOS project, and also into the Notification Service Extension target when extension automation is enabled, during the same prebuild pass. MP3 files are not supported here; convert them to one of the supported formats first.

Android icon notes:

- small icons should be transparent, monochrome status-bar assets,
- the plugin now warns when a small icon source is not a PNG, and
- the plugin warns when an icon source is not square.

## Documentation

- [Overview](https://notifee.app/react-native/docs/overview)
- [Reference](https://notifee.app/react-native/reference)

## Android 16 ongoing progress notifications

`@psync/notifee` now supports Android 16's promoted ongoing notification APIs:

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

### Android

The APIs for Android allow for creating rich, styled and highly interactive notifications. Below you'll find guides that cover the supported Android features.

| Topic                                                                                    |                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [Appearance](https://notifee.app/react-native/docs/android/appearance)                   | Change the appearance of a notification; icons, colors, visibility etc.                                                           |
| [Behaviour](https://notifee.app/react-native/docs/android/behaviour)                     | Customize how a notification behaves when it is delivered to a device; sound, vibration, lights etc.                              |
| [Channels & Groups](https://notifee.app/react-native/docs/android/channels)              | Organize your notifications into channels & groups to allow users to control how notifications are handled on their device        |
| [Foreground Service](https://notifee.app/react-native/docs/android/foreground-service)   | Long running background tasks can take advantage of a Android Foreground Services to display an on-going, prominent notification. |
| [Grouping & Sorting](https://notifee.app/react-native/docs/android/grouping-and-sorting) | Group and sort related notifications in a single notification pane.                                                               |
| [Interaction](https://notifee.app/react-native/docs/android/interaction)                 | Allow users to interact with your application directly from the notification with actions.                                        |
| [Progress Indicators](https://notifee.app/react-native/docs/android/progress-indicators) | Show users a progress indicator of an on-going background task, and learn how to keep it updated.                                 |
| [Styles](https://notifee.app/react-native/docs/android/styles)                           | Style notifications to show richer content, such as expandable images/text, or message conversations.                             |
| [Timers](https://notifee.app/react-native/docs/android/timers)                           | Display counting timers on your notification, useful for on-going tasks such as a phone call, or event time remaining.            |

### iOS

Below you'll find guides that cover the supported iOS features.

| Topic                                                                |                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --- |
| [Appearance](https://notifee.app/react-native/docs/ios/appearance)   | Change how the notification is displayed to your users.                                           |
| [Behaviour](https://notifee.app/react-native/docs/ios/behaviour)     | Control how notifications behave when they are displayed to a device; sound, critical alerts etc. |
| [Categories](https://notifee.app/react-native/docs/ios/categories)   | Create & assign categories to notifications.                                                      |
| [Interaction](https://notifee.app/react-native/docs/ios/interaction) | Handle user interaction with your notifications.                                                  |     |
| [Permissions](https://notifee.app/react-native/docs/ios/permissions) | Request permission from your application users to display notifications.                          |     |

### Jest Testing

To run jest tests after integrating this module, you will need to mock out the native parts of Notifee or you will get an error that looks like:

```bash
 ● Test suite failed to run

    Notifee native module not found.

      59 |     this._nativeModule = NativeModules[this._moduleConfig.nativeModuleName];
      60 |     if (this._nativeModule == null) {
    > 61 |       throw new Error('Notifee native module not found.');
         |             ^
      62 |     }
      63 |
      64 |     return this._nativeModule;
```

Add this to a setup file in your project e.g. `jest.setup.js`:

If you don't already have a Jest setup file configured, please add the following to your Jest configuration file and create the new jest.setup.js file in project root:

```js
setupFiles: ['<rootDir>/jest.setup.js'],
```

You can then add the following line to that setup file to mock `notifee`:

```js
jest.mock('@psync/notifee', () => require('@psync/notifee/jest-mock'));
```

You will also need to add `@psync/notifee` to `transformIgnorePatterns` in your config file (`jest.config.js`):

```bash
transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@psync/notifee)'
]
```

### Detox Testing

To utilise Detox's functionality to mock a local notification and trigger notifee's event handlers, you will need a payload with a key `__notifee_notification`:

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
      data: {}
    },
  },
}
```

The important part is to make sure you have a `__notifee_notification` object under `payload` with the default properties.

## License

- See [LICENSE](/LICENSE)

---

<p>
  <img align="left" width="50px" src="https://psync.club/favicon.ico">
  <p align="left">
    Built by <a href="https://invertase.io">Invertase</a> and maintained with 💖 by <a href="https://psync.club">Psync</a>.
  </p>
</p>

---
