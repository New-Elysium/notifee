# Migration Guide

This guide covers migrating to `@psync/notifee` from either the upstream `@notifee/react-native` or older React Native versions.

---

## Platform Requirements

| Requirement | Minimum Version |
|-------------|-----------------|
| React Native | 0.83+ (New Architecture only) |
| React | 19.2.4+ |
| iOS Deployment Target | 15.1+ |
| Android minSdk | 28+ |
| Android compileSdk | 36 |
| Xcode | 16.2+ |
| Java | 21 (source/target Java 17) |
| Gradle | 9.0.0 |
| Android Gradle Plugin | 8.8.2 |
| Kotlin | 2.2.0 |
| Swift | 6.0 |

---

## Migrating from `@notifee/react-native`

### 1. Update the package

```bash
# Remove old package
npm uninstall @notifee/react-native

# Install new package
npm install @psync/notifee
# or
bun add @psync/notifee
```

### 2. Update imports

```typescript
// Before
import notifee from '@notifee/react-native';

// After
import notifee from '@psync/notifee';
```

### 3. Update Jest mocks

```javascript
// Before
jest.mock('@notifee/react-native', () => require('@notifee/react-native/jest-mock'));

// After
jest.mock('@psync/notifee', () => require('@psync/notifee/jest-mock'));
```

### 4. Key differences from upstream

This fork is a complete migration to React Native's New Architecture:

- **TurboModules only** — no legacy Bridge support
- **Android bridge rewritten in Kotlin** (original was Java)
- **iOS bridge uses Objective-C++** with TurboModule conformance
- **Single Android module** — compiles core from source instead of bundled AAR
- **AlarmManager by default** instead of WorkManager for trigger notifications
- **pressAction defaults to `{ id: 'default', launchActivity: 'default' }`** when omitted
- **ongoing defaults to `true`** when `asForegroundService: true`
- **FOREGROUND_SERVICE_IMMEDIATE** by default on Android 12+
- **iOS `EventType.DELIVERED`** now emitted for all foreground notifications
- **Small icon fallback** to app launcher icon instead of crashing

See the CHANGELOG for full details on behavioral changes.

---

## Migrating from React Native 0.69–0.82

### Android Configuration

#### Gradle Wrapper (`gradle/wrapper/gradle-wrapper.properties`)
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.0.0-bin.zip
```

#### Root `build.gradle`
- AGP: `8.8.2`
- Kotlin: `2.2.0`

#### App `build.gradle`
```gradle
android {
    compileSdk 36
    defaultConfig {
        minSdk 28
        targetSdk 35
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

### iOS Configuration

#### Podfile
```ruby
platform :ios, '15.1'
```

#### Swift Version
```
6.0
```

### Metro Configuration

Update `metro.config.js` for React Native 0.83+ compatibility. See the example app's configuration for reference.

---

## Expo SDK 55 Compatibility

This package is compatible with Expo SDK 55 (React Native 0.83+). Key considerations:

- **No official Expo config plugin** is shipped yet. Direct native integration is recommended for `expo prebuild` users.
- **R8/ProGuard**: All critical ProGuard rules are included in the package. The `KeepForSdk` annotation and reflection targets are properly preserved.
- **Bridgeless mode**: Supported via runtime detection.
- **`smallIcon`** must be a native Android resource (not an Expo asset).
- **iOS notification sounds** must be bundled as native resources (`.wav`, `.aiff`, or `.caf`), not Expo assets.

---

## Firebase Integration

If using Firebase Cloud Messaging, see [FIREBASE_MIGRATION_v14_to_v23.md](./FIREBASE_MIGRATION_v14_to_v23.md) for upgrading from v14 to v23.

**Note**: Firebase Dynamic Links has been deprecated and removed. Migrate to Universal Links (iOS) and App Links (Android) for deep linking functionality.

---

## Verification

```bash
# Android
cd android && ./gradlew assembleDebug

# iOS
cd ios && pod install && xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -configuration Debug build

# Metro
npx react-native start --reset-cache
```
