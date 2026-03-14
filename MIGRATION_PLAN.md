# React Native Migration Analysis: 0.69.12 → 0.83.4
## Expo vs Bare React Native Comparison

### Executive Summary
Expo was used as a migration tool to upgrade from React Native 0.69.12 to 0.83.4. However, Expo introduced significant changes that are **not required** for bare React Native. This document provides a migration path to achieve the same result while staying on bare React Native.

---

## Key Differences: Expo vs Bare React Native

### 1. **Package Dependencies**

#### Expo-Added Dependencies (NOT needed for bare RN):
```json
{
  "expo": "~55.0.6",
  "@expo/cli": "^55.0.16"
}
```

#### Required for RN 0.83.4 (already in place):
```json
{
  "react": "^19.0.0",
  "react-native": "~0.83.2",
  "@babel/runtime": "^7.28.6",
  "@types/react": "~19.2.10"
}
```

### 2. **Android Changes**

#### What Expo Changed:
- **Modified `android/app/build.gradle`**: Added Expo-specific configuration with `entryFile` resolution via Expo CLI
- **Added Kotlin plugin**: `apply plugin: "org.jetbrains.kotlin.android"` (required for RN 0.73+)
- **Changed autolinking**: Uses `autolinkLibrariesWithApp()` instead of manual linking
- **Added bundleCommand**: `bundleCommand = "export:embed"` (Expo-specific)

#### What Bare RN 0.83 Actually Needs:
1. **Kotlin plugin** - Required for React Native 0.73+
2. **Updated `react` block** - New configuration format
3. **Gradle 8.x** - Already configured (8.2.2)
4. **namespace in build.gradle** - Required for AGP 8.x

### 3. **iOS Changes**

#### What Expo Changed:
- **Renamed project**: From `testing.xcodeproj` to `notifeetestsreactnative.xcodeproj`
- **Restructured directories**: Moved source files to `notifeetestsreactnative/` subdirectory
- **Added Expo modules**: ExpoModulesCore, Expo constants, etc.
- **Modified Podfile**: Uses Expo's autolinking system

#### What Bare RN 0.83 Actually Needs:
1. **New Architecture (Fabric) support** - Optional, can disable
2. **Updated Podfile structure** - New React Native podspec locations
3. **Codegen configuration** - Required for TurboModules
4. **Privacy manifest** - Required for App Store submissions

### 4. **Metro Configuration**

#### Expo Metro Config:
- Uses `@expo/cli` for bundling
- Modified entry file resolution
- Expo-specific asset handling

#### Bare RN 0.83 Metro Config:
- Can use standard `@react-native/metro-config` (if available)
- Or keep custom config with minimal changes
- Standard entry file resolution

---

## Migration Plan: Master → Bare React Native 0.83.4

### Phase 1: Preparation (Pre-Migration)

1. **Backup Current State**
   ```bash
   git checkout main
   git checkout -b bare-rn-83-migration
   ```

2. **Document Current Dependencies**
   - Save current `package.json`
   - Note Firebase version compatibility
   - Check Notifee version requirements

### Phase 2: Core Dependencies Update

1. **Update package.json**
   ```json
   {
     "dependencies": {
       "react": "^19.0.0",
       "react-native": "0.83.4",
       "@babel/runtime": "^7.28.6",
       "@notifee/react-native": "*",
       "@react-native-firebase/app": "^14.5.1",
       "@react-native-firebase/messaging": "^14.5.1",
       "react-native": "0.83.4"
     },
     "devDependencies": {
       "@types/react": "~19.2.10",
       "metro-react-native-babel-preset": "^0.77.0",
       "typescript": "^5.9.3"
     }
   }
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

### Phase 3: Android Migration

1. **Update `android/settings.gradle`**
   ```gradle
   rootProject.name = '@notifee_tests'
   
   include ':notifee_core'
   project(':notifee_core').projectDir = new File(rootProject.projectDir, '../../android')
   
   apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle")
   applyNativeModulesSettingsGradle(settings)
   
   include ':app'
   includeBuild('../node_modules/react-native-gradle-plugin')
   ```

2. **Update `android/build.gradle`**
   ```gradle
   buildscript {
     ext {
       buildToolsVersion = "34.0.0"
       minSdkVersion = 21
       compileSdkVersion = 34
       targetSdkVersion = 34
       ndkVersion = "25.1.8937393"
       kotlinVersion = "1.8.22"
     }
     dependencies {
       classpath("com.android.tools.build:gradle:8.2.2")
       classpath("com.facebook.react:react-native-gradle-plugin")
       classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")
       classpath("com.google.gms:google-services:4.3.10")
     }
   }
   ```

3. **Update `android/app/build.gradle`**
   ```gradle
   apply plugin: "com.android.application"
   apply plugin: "org.jetbrains.kotlin.android"
   apply plugin: "com.facebook.react"
   
   android {
     namespace "com.notifee.testing"
     compileSdkVersion rootProject.ext.compileSdkVersion
     
     defaultConfig {
       applicationId "com.notifee.testing"
       minSdkVersion rootProject.ext.minSdkVersion
       targetSdkVersion rootProject.ext.targetSdkVersion
       versionCode 1
       versionName "1.0"
     }
     
     buildFeatures {
       buildConfig true
     }
   }
   
   react {
     entryFile = file("../../index.js")
     reactNativeDir = file("../../node_modules/react-native")
   }
   ```

4. **Update `gradle-wrapper.properties`**
   ```properties
   distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-bin.zip
   ```

### Phase 4: iOS Migration

1. **Keep original project structure** (don't rename to `notifeetestsreactnative`)
   - Keep `testing.xcodeproj`
   - Keep original directory structure

2. **Update `ios/Podfile`**
   ```ruby
   require_relative '../node_modules/react-native/scripts/react_native_pods'
   require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'
   
   platform :ios, '13.4'
   prepare_react_native_project!
   
   target 'testing' do
     config = use_native_modules!
     
     use_react_native!(
       :path => config[:reactNativePath],
       :hermes_enabled => true,
       :fabric_enabled => false,  # Keep false unless you want New Architecture
       :app_path => "#{Pod::Config.instance.installation_root}/.."
     )
     
     # Notifee pods
     if defined?($NotifeeCoreFromSources) && $NotifeeCoreFromSources == true
       pod 'NotifeeCore', :path => "../../ios"
     end
   end
   ```

3. **Run Pod Install**
   ```bash
   cd ios && pod deintegrate && pod install
   ```

### Phase 5: JavaScript/TypeScript Updates

1. **Update `metro.config.js`**
   ```javascript
   const { resolve, join } = require('path');
   
   function escape(str) {
     return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }
   
   const rootDir = resolve(__dirname, '..');
   
   module.exports = {
     projectRoot: __dirname,
     resolver: {
       blocklist: [
         /.*\/__fixtures__\/.*/,
         new RegExp(`^${escape(resolve(rootDir, 'docs'))}\\/.*$`),
         new RegExp(`^${escape(resolve(rootDir, 'tests_react_native/ios'))}\\/.*$`),
         new RegExp(`^${escape(resolve(rootDir, 'tests_react_native/e2e'))}\\/.*$`),
         new RegExp(`^${escape(resolve(rootDir, 'tests_react_native/android'))}\\/.*$`),
         new RegExp(`^${escape(resolve(rootDir, 'tests_react_native/functions'))}\\/.*$`),
       ],
       extraNodeModules: new Proxy({}, {
         get: (target, name) => {
           if (typeof name !== 'string') return target[name];
           if (name && name.startsWith('@notifee')) {
             return join(__dirname, `../packages/${name.replace('@notifee/', '')}`);
           }
           return join(__dirname, `node_modules/${name}`);
         },
       }),
     },
     watchFolders: [resolve(__dirname, '../packages/react-native')],
   };
   ```

2. **Update `babel.config.js`** (if needed)
   ```javascript
   module.exports = {
     presets: ['module:metro-react-native-babel-preset'],
   };
   ```

### Phase 6: Testing & Validation

1. **Clean Build Artifacts**
   ```bash
   bun run build:clean
   cd android && ./gradlew clean
   cd ../ios && xcodebuild clean
   ```

2. **Test Android Build**
   ```bash
   cd tests_react_native
   npx react-native run-android
   ```

3. **Test iOS Build**
   ```bash
   cd tests_react_native
   npx react-native run-ios
   ```

---

## Critical Files to Preserve (From Master Branch)

These files contain custom Notifee configuration that must be preserved:

### Android:
- `android/app/src/main/java/com/notifee/testing/` - Custom Java/Kotlin code
- `android/app/src/main/AndroidManifest.xml` - Notification permissions
- `android/app/google-services.json` - Firebase config (if exists)
- `android/build.gradle` - Custom build configurations
- `android/settings.gradle` - Notifee core module inclusion

### iOS:
- `ios/testing/AppDelegate.m/h` - App lifecycle hooks
- `ios/testing/Info.plist` - Custom permissions and config
- `ios/testing/GoogleService-Info.plist` - Firebase config
- `ios/Podfile` - NotifeeCore pod configuration

### JavaScript:
- `index.js` / `index.test.js` - Entry points
- `__tests__/` - Test files
- `example/` - Example usage code
- `metro.config.js` - Custom metro configuration

---

## Expo-Specific Changes to Revert

### Remove These (Added by Expo):
1. **Expo dependencies** from package.json
2. **Expo-specific build.gradle configuration**
3. **Renamed iOS project** (revert to `testing`)
4. **Expo modules** in Podfile and Android
5. **Expo-specific entry file resolution**

### Keep These (Required for RN 0.83):
1. **React 19** and **React Native 0.83.4**
2. **@babel/runtime** dependency
3. **Kotlin plugin** in Android
4. **Gradle 8.x** (8.9 or 8.2.2)
5. **Android namespace** configuration
6. **buildFeatures.buildConfig true**
7. **Updated Metro config** (without Expo references)
8. **iOS 13.4+ deployment target**
9. **New Podfile structure** for RN 0.83
10. **Privacy manifest** (PrivacyInfo.xcprivacy)

---

## Potential Issues & Solutions

### Issue 1: Firebase Compatibility
- **Problem**: `@react-native-firebase` v14.x may have issues with RN 0.83
- **Solution**: Upgrade to latest Firebase SDK (v23.x) or patch for compatibility

### Issue 2: Notifee Core Compilation
- **Problem**: Native module compilation errors
- **Solution**: Ensure `notifee_core` module is properly linked in settings.gradle

### Issue 3: Metro Bundler Cache
- **Problem**: Cache issues after upgrade
- **Solution**: Clear metro cache: `npx react-native start --reset-cache`

### Issue 4: iOS New Architecture
- **Problem**: Fabric/TurboModules issues
- **Solution**: Keep `fabric_enabled: false` in Podfile until ready

### Issue 5: Android Namespace
- **Problem**: Package attribute in AndroidManifest.xml deprecated
- **Solution**: Use `namespace` in build.gradle instead

---

## Verification Checklist

- [ ] Android builds successfully (`./gradlew assembleDebug`)
- [ ] iOS builds successfully (`xcodebuild` or `npx react-native run-ios`)
- [ ] Metro bundler starts without errors
- [ ] App launches on both platforms
- [ ] Notifee notifications work (local)
- [ ] Firebase messaging works (if configured)
- [ ] All tests pass (`bun test`)
- [ ] No Expo dependencies in final build
- [ ] Bundle size is acceptable
- [ ] No console errors or warnings

---

## Migration Commands Summary

```bash
# 1. Create migration branch from master
git checkout main
git checkout -b bare-rn-83-migration

# 2. Update dependencies
bun install react@^19.0.0 react-native@0.83.4 @babel/runtime

# 3. Clean and rebuild
cd tests_react_native
bun run build:clean

# 4. Android
cd android
./gradlew clean
./gradlew assembleDebug

# 5. iOS
cd ../ios
pod deintegrate
pod install
npx react-native run-ios

# 6. Test
bun test
```

---

## Conclusion

The Expo migration provided a working path to React Native 0.83.4, but introduced unnecessary complexity. By following this bare React Native migration plan, you can achieve the same result while:
- **Keeping full control** over native code
- **Avoiding Expo lock-in**
- **Maintaining smaller bundle size**
- **Preserving all original functionality**

The key is to adopt only the necessary changes for RN 0.83 compatibility while reverting Expo-specific modifications.
