# Comparison: @psync/notifee vs react-native-notify-kit

**Date:** 2026-04-04  
**Compared repos:**
- **Ours:** `XChikuX/notifee` (`@psync/notifee` v9.2.7)
- **Theirs:** `marcocrupi/react-native-notify-kit` (`react-native-notify-kit` v9.1.11)

Both are maintained forks of the original `@notifee/react-native` by Invertase.

---

## Executive Summary

The `react-native-notify-kit` fork focuses on **New Architecture (TurboModules)** migration while keeping the core notification logic identical. Our fork focuses on **modern tooling** (Bun, latest RN/SDK versions) while keeping the legacy bridge working. The TypeScript source, validators, and API logic are nearly identical between both repos, with a few minor divergences.

---

## Architecture Comparison

| Aspect | @psync/notifee (Ours) | react-native-notify-kit (Theirs) |
|--------|----------------------|----------------------------------|
| **Native Bridge** | Legacy `NativeModules` (Java/ObjC) | TurboModules (Kotlin/ObjC++) |
| **Package Manager** | Bun 1.3.10 | Yarn 4.6.0 |
| **Min React Native** | >=0.83.2 | >=0.73.0 (targets 0.84) |
| **Min React** | >=19.2.4 | Not strictly enforced |
| **Android SDK** | compileSdk 36, Java 21 | compileSdk 35, Java 17 |
| **Gradle** | 9.0.0, AGP 8.8.2 | Not verified |
| **Test Runner** | Jest 30 + babel-jest | Jest 29 + ts-jest |
| **Test Location** | `tests_react_native/__tests__/` | `packages/react-native/__tests__/` |
| **iOS Core** | Separate `NotifeeCore` lib | Same `NotifeeCore` lib |
| **Android Core** | Separate AAR | Same AAR |

---

## Detailed File-by-File Comparison

### TypeScript Source (`packages/react-native/src/`)

| File | Status | Notes |
|------|--------|-------|
| `NotifeeApiModule.ts` | **Near-identical** | Same API methods, same validation flow. Minor divergence in cancel API routing and iOS `getNotificationSettings` (see bugs below). |
| `NotifeeNativeModule.ts` | **Different** | Ours uses `NativeModules[name]`; theirs uses `TurboModuleRegistry.getEnforcing<Spec>()`. Theirs has a proper TypeScript `Spec` type for the native module. |
| `NotifeeNativeModule.web.ts` | **Identical** | Both return empty stubs. |
| `NotifeeJSEventEmitter.ts` | **Identical** | Both use `react-native/Libraries/vendor/emitter/EventEmitter`. |
| `NotifeeNativeError.ts` | **Identical** | Same custom error class. |
| `index.ts` | **Identical** | Same export structure. |
| `types/*.ts` | **Identical** | All 8 type files match. |
| `utils/*.ts` | **Identical** | Same utility functions and constants. |
| `validators/*.ts` | **Identical** | All 17 validators + iosCommunicationInfo match. |

### Native Bridge Code

| Component | @psync/notifee | react-native-notify-kit |
|-----------|---------------|------------------------|
| **Android RN Bridge** | Java (6 files in `packages/react-native/android/.../java/`) | **Kotlin** (6 files in `packages/react-native/android/.../kotlin/`), TurboModule-conformant |
| **iOS RN Bridge** | Objective-C (`.m`) | **Objective-C++** (`.mm`), returns `NativeNotifeeModuleSpecJSI` |
| **Android Core** | Java AAR (unchanged) | Java AAR (unchanged) |
| **iOS Core** | ObjC/C++ (unchanged) | ObjC/C++ (unchanged) |
| **TurboModule Spec** | None | `src/specs/NativeNotifeeModule.ts` with full `Spec` interface |
| **Codegen Config** | None | `codegenConfig` in `package.json` |

### Test Infrastructure

| Aspect | @psync/notifee | react-native-notify-kit |
|--------|---------------|------------------------|
| **Location** | `tests_react_native/__tests__/` | `packages/react-native/__tests__/` |
| **Import style** | Relative: `../../packages/react-native/src/...` | Module alias: `react-native-notify-kit/src/...` |
| **Transpiler** | `babel-jest` | `ts-jest` |
| **TS config for tests** | Shares root `tsconfig.json` | Separate `tsconfig.jest.json` |
| **Setup** | `jest-setup.js` + `jest-mock.js` (separate files) | `__tests__/jest-setup.js` (combined) |
| **Test count** | 19 suites, 274 tests | ~20 suites, similar count |
| **Mock** | Missing `ANDROID_API_LEVEL` | Includes `getConstants: jest.fn(() => ({ ANDROID_API_LEVEL: 33 }))` |

### Test Coverage (same test cases in both repos)

Both repos have essentially the same validator test files:
- `validate.test.ts`
- `validateAndroidAction.test.ts` (note: typo `validateAndriodAction` in both)
- `validateAndroidChannel.test.ts`
- `validateAndroidChannelGroup.test.ts`
- `validateAndroidFullScreenAction.test.ts`
- `validateAndroidInput.test.ts`
- `validateAndroidNotification.test.ts`
- `validateAndroidPressAction.test.ts`
- `validateAndroidStyle.test.ts`
- `validateIOSAttachment.test.ts`
- `validateIOSCategory.test.ts`
- `validateIOSCategoryAction.test.ts`
- `validateIOSInput.test.ts`
- `validateIOSNotification.test.ts`
- `validateIOSPermissions.test.ts`
- `validateNotifications.test.ts`
- `validateTrigger.test.ts`
- `NotifeeApiModule.test.ts`
- `notifeeAppModule.test.ts`

---

## Bugs Found & Fixed (in this PR)

### 1. Missing `web: {}` in iOS `getNotificationSettings` response
**File:** `packages/react-native/src/NotifeeApiModule.ts`  
**Impact:** Low — mostly a type completeness issue  
**Found in:** Both repos (but notify-kit fixed it)  

The iOS path of `getNotificationSettings()` returned `{ authorizationStatus, ios, android }` without the `web: {}` field, while the Android and web paths both include it. The `NotificationSettings` type expects a `web` field. Fixed to include `web: {}` for consistency.

### 2. Incorrect `||` operator in `getChannelGroup`/`getChannelGroups`
**File:** `packages/react-native/src/NotifeeApiModule.ts`  
**Impact:** Low — works correctly by accident due to `undefined >= 26` being `false`  
**Found in:** Both repos (pre-existing from original notifee)  

```typescript
// Before (both repos):
if (isAndroid || this.native.ANDROID_API_LEVEL >= 26) { ... }

// After (correct, matches getChannel/getChannels/deleteChannel pattern):
if (isAndroid && this.native.ANDROID_API_LEVEL >= 26) { ... }
```

Every other channel-related method uses `&&`. The `||` was clearly a typo that happened to work because on non-Android platforms `ANDROID_API_LEVEL` is `undefined`, and `undefined >= 26` is `false`.

### 3. Missing `ANDROID_API_LEVEL` in native module mock
**File:** `packages/react-native/src/__mocks__/NotifeeNativeModule.ts`  
**Impact:** Low — tests worked without it but the mock was incomplete  

Added `ANDROID_API_LEVEL: 33` to the mock to match the actual native module interface.

### 4. Missing Android-specific cancel notification tests
**File:** `tests_react_native/__tests__/NotifeeApiModule.test.ts`  
**Impact:** Medium — Android cancel routing (using `cancelAllNotificationsWithIds` with `NotificationType` enum) was untested  

Added 6 new tests covering the Android cancel path which routes all cancel operations through `cancelAllNotificationsWithIds` with different `NotificationType` values (ALL=0, DISPLAYED=1, TRIGGER=2).

---

## What They Have That We Don't

### 1. TurboModule Support (HIGH EFFORT — NOT IMPLEMENTED)
**Their approach:** Full TurboModule migration with:
- `src/specs/NativeNotifeeModule.ts` — typed TurboModule spec
- Kotlin Android bridge (6 files, ~35KB total)
- Objective-C++ iOS bridge with `NativeNotifeeModuleSpecJSI`
- `codegenConfig` in `package.json` for React Native codegen

**Why we didn't implement:** This is the single biggest architectural difference. It requires:
- Rewriting the entire Android bridge from Java to Kotlin with TurboModule conformance
- Rewriting the iOS bridge from `.m` to `.mm` with JSI interop
- Adding codegen configuration
- Extensive testing on real devices
- Risk of breaking existing installations

**Recommendation:** This should be a dedicated migration effort in a separate PR. The legacy bridge still works on all React Native versions through the compatibility layer. When ready, the notify-kit Kotlin/ObjC++ files could serve as a reference implementation.

### 2. Smoke Test App (LOW VALUE)
They have `apps/smoke/` with a smoke test app. We have `packages/react-native/example/` which serves the same purpose.

### 3. `tsconfig.jest.json` (MINIMAL VALUE)
Separate TypeScript config for tests. Our babel-jest approach works fine without this.

### 4. Module Alias Imports in Tests (COSMETIC)
Their tests use `react-native-notify-kit/src/...` via Jest `moduleNameMapper`. Ours use relative paths. Both work; theirs is slightly cleaner but it's a cosmetic preference.

---

## What We Have That They Don't

### 1. Higher Minimum Requirements
We target React Native 0.83+ with React 19.2+, compileSdk 36, Java 21, and Gradle 9.0. This keeps us on the latest stable releases.

### 2. Bun Package Manager
Faster installs and builds with Bun 1.3.10 instead of Yarn 4.

### 3. Modern Jest 30
We use Jest 30 with babel-jest. They're still on Jest 29 with ts-jest.

### 4. Better Cancel API Test Coverage (now)
With the new tests added in this PR, we now have both iOS and Android cancel path tests.

### 5. Comprehensive CI Workflows
Multiple GitHub Actions workflows for tests, linting, building, and publishing.

### 6. TypeDoc Documentation Generation
Automated API reference generation via TypeDoc.

---

## Recommendations for Future Work

### High Priority
1. **TurboModule Migration** — Consider porting their Kotlin/ObjC++ bridge. This is the only significant feature gap. Their implementation is proven and could be adapted.

### Medium Priority
2. **Add TurboModule Spec** — Even without full migration, adding `src/specs/NativeNotifeeModule.ts` would prepare for the eventual migration and provide better TypeScript typing for the native module interface.

### Low Priority
3. **Module alias imports in tests** — Could clean up the test import paths to use a Jest `moduleNameMapper` instead of relative paths.
4. **Smoke test app** — Consider migrating `packages/react-native/example/` to a more comprehensive smoke test setup if needed.

---

## Test Results After Changes

```
Test Suites: 19 passed, 19 total
Tests:       274 passed, 274 total (was 268)
Time:        ~3s
```

All existing tests continue to pass. 6 new Android cancel tests were added.
