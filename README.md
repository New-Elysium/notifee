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

## Documentation

- [Overview](https://notifee.app/react-native/docs/overview)
- [Reference](https://notifee.app/react-native/reference)

## Expo Support

`@psync/notifee` ships an official Expo config plugin for `expo prebuild`. Add it to your Expo config:

```js
export default {
  expo: {
    plugins: [
      [
        '@psync/notifee',
        {
          apsEnvMode: 'development',
          backgroundModes: ['remote-notification'],
          androidIcons: [
            {
              name: 'ic_stat_notify',
              path: './assets/notifications/ic_stat_notify.png',
              type: 'small',
            },
          ],
          enableNotificationServiceExtension: true,
          iosSoundFiles: ['./assets/notifications/chime.wav'],
          iosDeploymentTarget: '15.1',
        },
      ],
    ],
  },
};
```

See the [package README](./packages/react-native/README.md#expo-config-plugin) for all supported options.

## Expo Support TODOs
- [ ] Add an Expo Router deep-link helper preset for common notification press/open flows
- [ ] Publish a companion `expo-build-properties` preset / guide for SDK, JDK, and native build alignment
- [ ] Add config-plugin support for foreground service manifest customization
- [ ] Add an Expo + FCM interop preset covering Expo Push, direct FCM, and Notifee coexistence
- [ ] Ship multiple Notification Service Extension templates (basic, rich media, communication notifications)

## Development

This is a monorepo managed with Bun workspaces. See [CLAUDE.md](./CLAUDE.md) for detailed development instructions.

### Quick Start for Development

```bash
# Clone and setup
git clone https://github.com/New-Elysium/notifee.git
cd notifee
bun install

# Build core libraries
bun run build:core

# Build React Native package
bun run build:rn

# Run tests
bun run test:all

# Run example app
cd packages/react-native/example
bun install --ignore-scripts
npx react-native run-android  # or run-ios
```

### Available Scripts

```bash
# Core builds
bun run build:core              # Build Android & iOS core libraries
bun run build:core:android      # Build Android core only
bun run build:core:ios          # Build iOS core only

# React Native builds
bun run build:rn                # Build React Native package
bun run build:rn:watch          # Build with watch mode

# Testing
bun run test:all                # Run all tests
bun run test:unit               # Run unit tests only
bun run test:e2e                # Run E2E tests

# Example apps
cd packages/react-native/example && npx react-native run-android
cd packages/react-native/example && npx react-native run-ios

# Publishing (after fully building)
npm login
npm publish                     # in ./packages/react-native/
```

### Android

The APIs for Android allow for creating rich, styled and highly interactive notifications. Below you'll find guides that cover the supported Android features.

| Topic                                                                                    |                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [Appearance](https://notifee.app/react-native/docs/android/appearance)                   | Change the appearance of a notification; icons, colors, visibility etc.                                                           |
| [Behaviour](https://notifee.app/react-native/docs/android/behaviour)                     | Customize how a notification behaves when it is delivered to a device; sound, vibration, lights etc.                              |
| [Channels & Groups](https://notifee.app/react-native/docs/android/channels)              | Organize your notifications into channels & groups to allow users to control how notifications are handled on their device        |
| [Foreground Service](https://notifee.app/react-native/docs/android/foreground-service)   | Long running background tasks can take advantage of an Android Foreground Service to display an on-going, prominent notification. |
| [Grouping & Sorting](https://notifee.app/react-native/docs/android/grouping-and-sorting) | Group and sort related notifications in a single notification pane.                                                               |
| [Interaction](https://notifee.app/react-native/docs/android/interaction)                 | Allow users to interact with your application directly from the notification, with actions.                                       |
| [Progress Indicators](https://notifee.app/react-native/docs/android/progress-indicators) | Show users a progress indicator of an on-going background task, and learn how to keep it updated.                                 |
| [Styles](https://notifee.app/react-native/docs/android/styles)                           | Style notifications to show richer content, such as expandable images/text, or message conversations.                             |
| [Timers](https://notifee.app/react-native/docs/android/timers)                           | Display counting timers on your notification, useful for on-going tasks such as a phone call, or event time remaining.            |

### iOS

Below you'll find guides that cover the supported iOS features.

| Topic                                                                |                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| [Appearance](https://notifee.app/react-native/docs/ios/appearance)   | Change how the notification is displayed to your users.                                            |
| [Behaviour](https://notifee.app/react-native/docs/ios/behaviour)     | Control how notifications behave when they are displayed on a device; sound, crtitial alerts, etc. |
| [Categories](https://notifee.app/react-native/docs/ios/categories)   | Create & assign categories to notifications.                                                       |
| [Interaction](https://notifee.app/react-native/docs/ios/interaction) | Handle user interaction with your notifications.                                                   |     |
| [Permissions](https://notifee.app/react-native/docs/ios/permissions) | Request permission from your application users to display notifications.                           |     |

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


**Note**: Firebase Dynamic Links has been deprecated and removed. Migrate to Universal Links (iOS) and App Links (Android) for deep linking functionality.

## License

- See [LICENSE](/LICENSE)

---

<p>
  <img align="left" width="50px" src="https://psync.club/favicon.ico">
  <p align="left">
    Built by <a href="https://invertase.io">Invertase</a> and maintained with 💖 by <a href="https://psync.club">Psync</a>.
  </p>
</p>
