# Example App Gradle Triage Report

## Root Cause Summary

The example app's Android Gradle configuration was incompatible with React Native 0.83+ due to fundamental changes in autolinking and Bun workspace structure.

## Issues Found

### Issue 1: settings.gradle - Invalid Autolinking Method

**Problem**: Old autolinking method no longer exists in RN 0.83+:
```groovy
apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle");
applyNativeModulesSettingsGradle(settings)
```

**Also problematic**: Incorrect gradle plugin path for Bun workspace:
```groovy
includeBuild('../node_modules/react-native-gradle-plugin')
```

### Issue 2: build.gradle - Variable Names

**Problem**: Outdated variable names:
```groovy
compileSdkVersion = 36  // Wrong - no longer works in RN 0.83+
minSdkVersion = 24     // Wrong - should be minSdk
targetSdkVersion = 36  // Wrong - should be targetSdk
```

### Issue 3: react-native.config.js - Missing packageName

**Problem**: Autolinking requires `packageName` in android platform config.

## Fixes Applied

### Fix 1: settings.gradle

Updated to RN 0.84+ format:
```groovy
pluginManagement {
    includeBuild("../../../../node_modules/.bun/@react-native+gradle-plugin@0.83.4/node_modules/@react-native/gradle-plugin")
}

plugins {
    id("com.facebook.react.settings")
}

extensions.configure(com.facebook.react.ReactSettingsExtension){ ex ->
    ex.autolinkLibrariesFromCommand()
}

rootProject.name = 'example'
include ':app'
includeBuild("../../../../node_modules/.bun/@react-native+gradle-plugin@0.83.4/node_modules/@react-native/gradle-plugin")
```

### Fix 2: build.gradle

Updated variable names:
- `compileSdkVersion` → `compileSdk`
- `minSdkVersion` → `minSdk` 
- `targetSdkVersion` → `targetSdk`

### Fix 3: react-native.config.js

Added `packageName: 'io.invertase.notifee'` to android platform config.

## Path Resolution

From `packages/react-native/example/android/`:
- `../../../../../` = project root (`notifee/`)
- Gradle plugin path: `node_modules/.bun/@react-native+gradle-plugin@0.83.4/node_modules/@react-native/gradle-plugin`

## Testing

```bash
cd packages/react-native/example/android
./gradlew tasks --no-daemon
```

## Alternative Solution

Use `refresh-example.sh` script to regenerate from latest RN template:
```bash
cd packages/react-native
./refresh-example.sh
```