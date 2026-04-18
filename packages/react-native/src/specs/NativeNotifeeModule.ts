/*
 * Copyright (c) 2016-present Invertase Limited
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type {
  DisplayedNotification,
  InitialNotification,
  NotificationSettings,
  TriggerNotification,
} from '../types/Notification';
import type { NativeAndroidChannel, NativeAndroidChannelGroup } from '../types/NotificationAndroid';
import type { IOSNotificationCategory } from '../types/NotificationIOS';
import type { PowerManagerInfo } from '../types/PowerManagerInfo';

export interface Spec extends TurboModule {
  // Constants (Android only; iOS returns 0)
  ANDROID_API_LEVEL: number;
  getConstants(): { ANDROID_API_LEVEL: number };

  // ─── Shared ───────────────────────────────────────────────────────────────

  cancelAllNotifications(): Promise<void>;
  cancelDisplayedNotifications(): Promise<void>;
  cancelTriggerNotifications(): Promise<void>;
  cancelAllNotificationsWithIds(ids: Array<string>): Promise<void>;
  cancelAllNotificationsWithIds(
    ids: Array<string>,
    notificationType: number,
    tag: string | null,
  ): Promise<void>;
  getDisplayedNotifications(): Promise<DisplayedNotification[]>;
  getTriggerNotifications(): Promise<TriggerNotification[]>;
  getTriggerNotificationIds(): Promise<Array<string>>;
  displayNotification(notification: object): Promise<void>;
  createTriggerNotification(notification: object, trigger: object): Promise<void>;
  requestPermission(permissions?: object): Promise<NotificationSettings>;
  getNotificationSettings(): Promise<NotificationSettings>;
  getInitialNotification(): Promise<InitialNotification | null>;

  // ─── Android-only ─────────────────────────────────────────────────────────

  createChannel(channelMap: object): Promise<void>;
  createChannels(channelsArray: Array<object>): Promise<void>;
  createChannelGroup(channelGroupMap: object): Promise<void>;
  createChannelGroups(channelGroupsArray: Array<object>): Promise<void>;
  deleteChannel(channelId: string): Promise<void>;
  deleteChannelGroup(channelGroupId: string): Promise<void>;
  getChannel(channelId: string): Promise<NativeAndroidChannel | null>;
  getChannels(): Promise<NativeAndroidChannel[]>;
  getChannelGroup(channelGroupId: string): Promise<NativeAndroidChannelGroup | null>;
  getChannelGroups(): Promise<NativeAndroidChannelGroup[]>;
  isChannelCreated(channelId: string): Promise<boolean>;
  isChannelBlocked(channelId: string): Promise<boolean>;
  openAlarmPermissionSettings(): Promise<void>;
  openNotificationSettings(channelId: string | null): Promise<void>;
  openBatteryOptimizationSettings(): Promise<void>;
  isBatteryOptimizationEnabled(): Promise<boolean>;
  getPowerManagerInfo(): Promise<PowerManagerInfo>;
  openPowerManagerSettings(): Promise<void>;
  stopForegroundService(): Promise<void>;
  hideNotificationDrawer(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;

  // ─── iOS-only ─────────────────────────────────────────────────────────────

  cancelNotification(notificationId: string): Promise<void>;
  cancelDisplayedNotification(notificationId: string): Promise<void>;
  cancelTriggerNotification(notificationId: string): Promise<void>;
  cancelDisplayedNotificationsWithIds(ids: Array<string>): Promise<void>;
  cancelTriggerNotificationsWithIds(ids: Array<string>): Promise<void>;
  getNotificationCategories(): Promise<IOSNotificationCategory[]>;
  setNotificationCategories(categories: Array<object>): Promise<void>;
  setBadgeCount(count: number): Promise<void>;
  getBadgeCount(): Promise<number>;
  incrementBadgeCount(incrementBy: number): Promise<void>;
  decrementBadgeCount(decrementBy: number): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NotifeeApiModule');
