# Firebase React Native Migration Guide: v14 → v23

**Date**: 2026-03-15  
**Current Version**: `@react-native-firebase/app` & `messaging` at `^14.5.1` (resolves to 14.12.0)  
**Target Version**: `^23.8.8`  
**Status**: Ready for migration

---

## TL;DR

This migration involves:
1. ✅ **Platform requirements already met** (iOS 15.1, Android minSdk 28, RN 0.83)
2. ⚠️ **Remove Firebase Dynamic Links** (deprecated, shuts down Aug 25, 2025)
3. ⚠️ **Migrate to Modular API** (namespaced API deprecated in v22)
4. ✅ **Update package versions** in `package.json`

---

## 1. Platform Requirements Check

| Requirement | v23 Minimum | Current Project | Status |
|-------------|-------------|-----------------|--------|
| iOS Deployment Target | 15.0 | 15.1 | ✅ Met |
| Android minSdk | 23 | 28 | ✅ Met |
| Xcode | 16.2+ | N/A (CLI tools only) | ⚠️ Verify |
| React Native | 0.76+ optimized | 0.83.2 | ✅ Met |
| CocoaPods | 1.12.0+ | 1.16.2 | ✅ Met |

---

## 2. Breaking Changes Summary

### Version 23 Breaking Changes

| Change | Impact | Action Required |
|--------|--------|-----------------|
| **Dynamic Links REMOVED** | High | Remove all Dynamic Links configuration |
| Android minSdk bumped to 23 | Low | Already at 28 |
| iOS deployment target bumped to 15 | Low | Already at 15.1 |
| Xcode 16.2+ required | Medium | Verify Xcode installation |
| `gaMeasurementId` → `measurementId` | Low | Rarely used in this project |

### Version 22 Breaking Changes (Modular API)

| Change | Impact | Action Required |
|--------|--------|-----------------|
| **Namespaced API deprecated** | High | Migrate all Firebase calls |
| `firebase.messaging()` → `getMessaging()` | High | Update all messaging code |
| `messaging().getToken()` → `getToken(messaging)` | High | Update method calls |

---

## 3. Dynamic Links Removal

Firebase Dynamic Links was deprecated by Google and will be **completely shut down on August 25, 2025**.

### Files Requiring Changes

#### 3.1 iOS - Remove Entitlements

**File**: `tests_react_native/ios/testing/testing.entitlements`

```xml
<!-- REMOVE THIS LINE -->
<string>applinks:reactnativefirebase.page.link</string>
```

**File**: `tests_react_native/ios/testing/NotifeeRelease.entitlements`

```xml
<!-- REMOVE THIS LINE -->
<string>applinks:reactnativefirebase.page.link</string>
```

#### 3.2 iOS - Remove Info.plist Entry

**File**: `tests_react_native/ios/testing/Info.plist`

```xml
<!-- REMOVE THESE LINES -->
<key>FirebaseDynamicLinksCustomDomains</key>
<array>
    <string>https://invertase.io/hire-us</string>
</array>
```

### Migration Options

If deep linking functionality is needed, migrate to:
- **Universal Links** (iOS) + **App Links** (Android)
- Third-party alternatives: Branch, Adjust, AppsFlyer

---

## 4. Modular API Migration

The namespaced API (`firebase.messaging()`) is deprecated. Must migrate to modular API.

### 4.1 Current Code (Namespaced - Deprecated)

**File**: `tests_react_native/index.js`

```javascript
// CURRENT (deprecated)
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/messaging';

firebase.messaging().setBackgroundMessageHandler(async message => {
  console.log('onBackgroundMessage New FCM Message', message);
});
```

### 4.2 New Code (Modular API)

```javascript
// NEW (modular API)
import messaging, { 
  getMessaging, 
  setBackgroundMessageHandler 
} from '@react-native-firebase/messaging';

setBackgroundMessageHandler(getMessaging(), async message => {
  console.log('onBackgroundMessage New FCM Message', message);
});
```

### 4.3 API Migration Reference Table

| Namespaced (Deprecated) | Modular (New) |
|------------------------|---------------|
| `import firebase from '@react-native-firebase/app'` | `import { getApp } from '@react-native-firebase/app'` |
| `firebase.messaging()` | `getMessaging()` |
| `messaging().getToken()` | `getToken(getMessaging())` |
| `messaging().onMessage(callback)` | `onMessage(getMessaging(), callback)` |
| `messaging().requestPermission()` | `requestPermission(getMessaging())` |
| `messaging().setBackgroundMessageHandler(handler)` | `setBackgroundMessageHandler(getMessaging(), handler)` |
| `messaging().subscribeToTopic(topic)` | `subscribeToTopic(getMessaging(), topic)` |
| `messaging().unsubscribeFromTopic(topic)` | `unsubscribeFromTopic(getMessaging(), topic)` |
| `messaging().deleteToken()` | `deleteToken(getMessaging())` |
| `messaging().onTokenRefresh(callback)` | `onTokenRefresh(getMessaging(), callback)` |

### 4.4 Files Requiring Code Changes

| File | Changes Needed |
|------|----------------|
| `tests_react_native/index.js` | Migrate to modular API |
| `tests_react_native/example/app.tsx` | Migrate `getToken()`, `onMessage()` |
| `tests_react_native/example/videoApp.tsx` | Migrate `getToken()`, `onMessage()` |
| `tests_react_native/example/ios-test.tsx` | Verify Firebase imports |

---

## 5. Step-by-Step Migration Guide

### Step 1: Update package.json

```bash
cd tests_react_native

# Update Firebase packages
npm install @react-native-firebase/app@latest @react-native-firebase/messaging@latest
```

Or manually update `package.json`:

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^23.8.8",
    "@react-native-firebase/messaging": "^23.8.8"
  }
}
```

### Step 2: Remove Dynamic Links Configuration

```bash
# Remove from entitlements files
# Edit: tests_react_native/ios/testing/testing.entitlements
# Edit: tests_react_native/ios/testing/NotifeeRelease.entitlements
# Edit: tests_react_native/ios/testing/Info.plist
```

### Step 3: Update iOS Pods

```bash
cd tests_react_native/ios
pod install
```

### Step 4: Migrate JavaScript Code

Update all files listed in section 4.4 to use modular API.

### Step 5: Clean and Rebuild

```bash
# iOS
cd tests_react_native/ios
pod deintegrate
pod install

# Android
cd tests_react_native/android
./gradlew clean

# Rebuild
npm start -- --reset-cache
```

---

## 6. Testing Checklist

After migration, verify:

- [ ] App builds successfully on iOS
- [ ] App builds successfully on Android
- [ ] FCM token retrieval works
- [ ] Foreground messages received (`onMessage`)
- [ ] Background messages handled (`setBackgroundMessageHandler`)
- [ ] Push notifications display correctly
- [ ] No deprecation warnings in console
- [ ] No Dynamic Links references remain

---

## 7. Optional: Silence Deprecation Warnings (Temporary)

If you need to defer the modular API migration, you can temporarily silence warnings:

```javascript
// Add at the very top of index.js, before any Firebase imports
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
```

> ⚠️ **Warning**: This is a temporary workaround. The namespaced API will be removed in a future major version.

---

## 8. References

- [Official v23 Migration Guide](https://rnfirebase.io/migrating-to-v23)
- [Official v22 Migration Guide (Modular API)](https://rnfirebase.io/migrating-to-v22)
- [Firebase Dynamic Links Deprecation FAQ](https://firebase.google.com/support/dynamic-links-faq)
- [React Native Firebase Releases](https://rnfirebase.io/releases)
- [Firebase Messaging Documentation](https://rnfirebase.io/messaging/usage)

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Build failures due to Xcode version | Medium | High | Verify Xcode 16.2+ is installed |
| Runtime errors from API changes | Medium | High | Thorough testing of messaging flow |
| Dynamic Links breakage | Low | Low | Already planned for removal |
| CocoaPods version incompatibility | Low | Medium | Update CocoaPods if needed |

---

## 10. Estimated Effort

| Task | Time Estimate |
|------|---------------|
| Update packages | 5 min |
| Remove Dynamic Links | 10 min |
| Migrate to modular API | 30-60 min |
| Testing | 30 min |
| **Total** | **1.5-2 hours** |

---

## Appendix A: Complete Code Diff for index.js

### Before

```javascript
import { AppRegistry } from 'react-native';
import '@react-native-firebase/messaging';
import firebase from '@react-native-firebase/app';
import notifee from '@psync/notifee';

import App from './example/app';

firebase.messaging().setBackgroundMessageHandler(async message => {
  console.log('onBackgroundMessage New FCM Message', message);
});

notifee.onBackgroundEvent(async event => {
  console.log('notifee.onBackgroundEvent triggered: ' + JSON.stringify(event));
});

AppRegistry.registerComponent('testing', () => App);
```

### After

```javascript
import { AppRegistry } from 'react-native';
import notifee from '@psync/notifee';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

import App from './example/app';

// Initialize messaging instance
const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async message => {
  console.log('onBackgroundMessage New FCM Message', message);
});

notifee.onBackgroundEvent(async event => {
  console.log('notifee.onBackgroundEvent triggered: ' + JSON.stringify(event));
});

AppRegistry.registerComponent('testing', () => App);
```

---

## Appendix B: Complete Code Diff for app.tsx (Messaging Parts)

### Before

```typescript
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/messaging';

// ...

async function init(): Promise<void> {
  const fcmToken = await firebase.messaging().getToken();
  console.log({ fcmToken });
  firebase.messaging().onMessage(onMessage);
  // ...
}
```

### After

```typescript
import { getMessaging, getToken, onMessage } from '@react-native-firebase/messaging';

// ...

async function init(): Promise<void> {
  const messaging = getMessaging();
  const fcmToken = await getToken(messaging);
  console.log({ fcmToken });
  onMessage(messaging, onMessage);
  // ...
}
```
