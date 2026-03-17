# Example App Gradle Triage Report

## Root Cause Summary

The example app's Android Gradle configuration was incompatible with React Native 0.83+ due to fundamental changes in how autolinking works. The example uses Bun workspaces, meaning `node_modules` is hoisted to the monorepo root rather than nested in the example folder.

## Issues Found

### Issue 1: settings.gradle - Invalid Autolinking Method

**Problem**: The old `settings.gradle` used:
```groovy
apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle");
applyNativeModulesSettingsGradle(settings)
```

This approach no longer exists in React Native 0.83+. The `native_modules.gradle` file was removed.

**Also problematic**: The old includeBuild path:
```groovy
includeBuild('../node_modules/react-native-gradle-plugin')
```

This path doesn't exist because:
1. The example doesn't have its own `node_modules` (Bun workspace)
2. The gradle plugin is in `.bun/@react-native+gradle-plugin@0.83.4/node_modules/@react-native/gradle-plugin`

### Issue 2: build.gradle - Wrong node_modules Path

**Problem**: The build.gradle referenced:
```groovy
url("$rootDir/../node_modules/react-native/android")
```

For a Bun workspace, this should be:
```groovy
url("$rootDir/../../node_modules/react-native/android")
```

### Issue 3: build.gradle - Wrong ext Variable Name

**Problem**: The root build.gradle used:
```groovy
compileSdkVersion = 36  // Wrong - no longer works in RN 0.83+
```

It should be:
```groovy
compileSdk = 36  // Correct for RN 0.83+
```

### Issue 4: react-native.config.js - Missing packageName

**Problem**: The autolinking requires `packageName` in the android platform config:
```javascript
platforms: {
  android: {
    packageName: 'io.invertase.notifee',  // This was missing
    packageImportPath: '...',
    packageInstance: '...'
  }
}
```

## Fixes Applied

### Fix 1: settings.gradle

Replaced with RN 0.84+ format:
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

- Changed `compileSdkVersion` to `compileSdk`
- Fixed node_modules path to use `../../node_modules`
- Updated classpath to use the react-native-gradle-plugin correctly

### Fix 3: react-native.config.js

Added `packageName: 'io.invertase.notifee'` to the android platform config.

### Fix 4: gradle.properties

Removed or set `newArchEnabled=false` is no longer supported in RN 0.82+. The New Architecture is now enabled by default.

## Path Resolution

From `packages/react-native/example/android/`:
- `../../` = `packages/react-native/example/`
- `../../../../` = `packages/react-native/`
- `../../../../../` = project root (`notifee/`)

The gradle plugin is at:
`node_modules/.bun/@react-native+gradle-plugin@0.83.4/node_modules/@react-native/gradle-plugin`

## Testing

After fixes, run:
```bash
cd packages/react-native/example/android
./gradlew tasks --no-daemon
```

If it lists available tasks, the configuration is correct.

## Alternative Solution

Instead of manually fixing, use the `refresh-example.sh` script which regenerates the example from React Native's latest template:
```bash
cd packages/react-native
./refresh-example.sh
```

This creates a fresh RN project and copies the custom notifee code back in.