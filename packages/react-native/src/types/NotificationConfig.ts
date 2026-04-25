/*
 * Copyright (c) 2016-present Invertase Limited
 */

/**
 * iOS-specific notification configuration options.
 */
export interface NotificationConfigIOS {
  /**
   * When `true` (default), Notifee intercepts iOS remote notification tap handlers,
   * preventing libraries like `@react-native-firebase/messaging` from receiving
   * `onNotificationOpenedApp` / `getInitialNotification` events.
   *
   * Set to `false` to allow other libraries to handle remote notification taps.
   * Local notifications created via `displayNotification()` or `createTriggerNotification()`
   * are always handled by Notifee regardless of this setting.
   *
   * When omitted, the native implementation defaults this to `true` for backward compatibility.
   *
   * @default true
   */
  interceptRemoteNotifications?: boolean;
}

/**
 * Configuration object for controlling Notifee's notification handling behavior.
 *
 * Use `setNotificationConfig()` to apply this configuration.
 *
 * ```js
 * import notifee from '@psync/notifee';
 *
 * // Allow Firebase Messaging to handle remote notification taps
 * await notifee.setNotificationConfig({
 *   ios: {
 *     interceptRemoteNotifications: false,
 *   },
 * });
 * ```
 */
export interface NotificationConfig {
  /**
   * iOS-specific notification configuration.
   */
  ios?: NotificationConfigIOS;
}
