# Notifee Lab — Example App

A comprehensive notification testing suite for `@psync/notifee`. Demonstrates the full API surface across Android and iOS.

## Prerequisites

- React Native 0.83+ development environment (see [CLAUDE.md](../../../CLAUDE.md))
- Android SDK (API 36+) for Android builds
- Xcode 16.2+ for iOS builds

## Setup

From the monorepo root:

```bash
bun install
bun run build:core
bun run build:rn
```

## Running the app

### Start Metro

```bash
bun start
```

### Android

```bash
bun run android
```

### iOS

```bash
cd ios && pod install && cd ..
bun run ios
```

> **Note for Bun users**: When using Bun workspaces, Metro may have symlink resolution issues. See [SYMLINK.md](./SYMLINK.md) for troubleshooting and workarounds.

## What's included

The example app demonstrates:

| Category           | Features                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Basic**          | Simple notifications, custom message input                                                                                         |
| **Cross-Platform** | Notification actions with reply/like, big picture attachments                                                                      |
| **Android**        | Inbox style, BigText, progress bars, full-screen intents, messaging style, grouped notifications, styled notifications, local-only |
| **iOS**            | Communication info, time-sensitive notifications, rich attachments, categories, badge count management                             |
| **Background**     | Foreground service demo, timed/scheduled triggers, interval triggers, AlarmManager triggers (Android)                              |
| **Configuration**  | Permission handling, notification settings, FCM config, initial notification check                                                 |
| **Channels**       | Channel groups, channel status, create/delete channels (Android)                                                                   |
| **Power Manager**  | Battery optimization, alarm permissions, manufacturer-specific power settings (Android)                                            |
| **FCM**            | Simulated FCM messages via `handleFcmMessage()`                                                                                    |
| **Triggers**       | Timestamp, interval, and AlarmManager-based scheduled notifications                                                                |
