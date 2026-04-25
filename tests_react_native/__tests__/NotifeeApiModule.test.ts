// @ts-ignore
import NotifeeApiModule from '../../packages/react-native/src/NotifeeApiModule';
import Notifee, { AuthorizationStatus } from '../../packages/react-native/src/index';

import {
  /* @ts-ignore */
  mockNotifeeNativeModule,
} from '../../packages/react-native/src/NotifeeNativeModule';
import {
  AndroidChannel,
  AndroidNotificationSetting,
} from '../../packages/react-native/src/types/NotificationAndroid';
import { setPlatform } from './testSetup';
import { TriggerNotification, TriggerType } from '../../packages/react-native/src';

jest.mock('../../packages/react-native/src/NotifeeNativeModule');

const apiModule = new NotifeeApiModule({
  version: Notifee.SDK_VERSION,
  nativeModuleName: 'NotifeeApiModule',
  nativeEvents: [],
});

describe('Notifee Api Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Module is defined on import', () => {
    expect(NotifeeApiModule).toBeDefined();
  });
  test('Constructor', () => {
    expect(apiModule).not.toBeNull();
  });

  test('getDisplayedNotifications', async () => {
    const notification = {
      id: 'notification',
      date: new Date(Date.now()).getTime(),
      notification: {
        id: 'notification',
      },
    };
    const notifications = [notification];
    mockNotifeeNativeModule.getDisplayedNotifications.mockResolvedValue(notifications);

    const res = await apiModule.getDisplayedNotifications();
    expect(res.length).toBe(1);
    expect(res[0]).toBe(notification);
    expect(mockNotifeeNativeModule.getDisplayedNotifications).toHaveBeenCalledTimes(1);
  });

  test('getTriggerNotifications', async () => {
    const triggerNotification: TriggerNotification = {
      notification: { id: 'notification' },
      trigger: {
        type: TriggerType.TIMESTAMP,
        timestamp: new Date(Date.now()).getTime(),
      },
    };

    const triggerNotifications = [triggerNotification];
    mockNotifeeNativeModule.getTriggerNotifications.mockResolvedValue(triggerNotifications);

    const res = await apiModule.getTriggerNotifications();
    expect(res).toBe(triggerNotifications);
    expect(mockNotifeeNativeModule.getTriggerNotifications).toHaveBeenCalledTimes(1);
  });

  test('getTriggerNotificationIds', async () => {
    const triggerIds = ['12345'];
    mockNotifeeNativeModule.getTriggerNotificationIds.mockResolvedValue(triggerIds);

    const res = await apiModule.getTriggerNotificationIds();
    expect(res).toBe(triggerIds);
    expect(mockNotifeeNativeModule.getTriggerNotificationIds).toHaveBeenCalledTimes(1);
  });

  test('cancelAllNotifications', async () => {
    const res = await apiModule.cancelAllNotifications();

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotifications).toHaveBeenCalledTimes(1);
  });

  test('cancelDisplayedNotifications', async () => {
    const res = await apiModule.cancelDisplayedNotifications();

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelDisplayedNotifications).toHaveBeenCalledTimes(1);
  });

  test('cancelTriggerNotifications', async () => {
    const res = await apiModule.cancelTriggerNotifications();

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelTriggerNotifications).toHaveBeenCalledTimes(1);
  });

  test('cancelAllNotifications(ids) - iOS', async () => {
    setPlatform('ios');
    const res = await apiModule.cancelAllNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenNthCalledWith(1, ['id']);
  });

  test('cancelDisplayedNotifications(ids) - iOS', async () => {
    setPlatform('ios');
    const res = await apiModule.cancelDisplayedNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelDisplayedNotificationsWithIds).toHaveBeenNthCalledWith(1, ['id']);
  });

  test('cancelTriggerNotifications(ids) - iOS', async () => {
    setPlatform('ios');
    const res = await apiModule.cancelTriggerNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelTriggerNotificationsWithIds).toHaveBeenNthCalledWith(1, ['id']);
  });

  test('cancelNotification - iOS', async () => {
    setPlatform('ios');
    const notificationId = 'id';
    const res = await apiModule.cancelNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelNotification).toHaveBeenCalledWith(notificationId);
  });

  test('cancelDisplayedNotification - iOS', async () => {
    setPlatform('ios');
    const notificationId = 'id';
    const res = await apiModule.cancelDisplayedNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelDisplayedNotification).toHaveBeenCalledWith(notificationId);
  });

  test('cancelTriggerNotification - iOS', async () => {
    setPlatform('ios');
    const notificationId = 'id';
    const res = await apiModule.cancelTriggerNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelTriggerNotification).toHaveBeenCalledWith(notificationId);
  });

  test('cancelAllNotifications(ids) - Android', async () => {
    setPlatform('android');
    const res = await apiModule.cancelAllNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenNthCalledWith(
      1,
      ['id'],
      0,
      null,
    );
  });

  test('cancelDisplayedNotifications(ids) - Android', async () => {
    setPlatform('android');
    const res = await apiModule.cancelDisplayedNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenNthCalledWith(
      1,
      ['id'],
      1,
      null,
    );
  });

  test('cancelTriggerNotifications(ids) - Android', async () => {
    setPlatform('android');
    const res = await apiModule.cancelTriggerNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenNthCalledWith(1, ['id'], 2, null);
  });

  test('cancelNotification - Android', async () => {
    setPlatform('android');
    const notificationId = 'id';
    const res = await apiModule.cancelNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenCalledWith(
      [notificationId],
      0,
      null,
    );
  });

  test('cancelDisplayedNotification - Android', async () => {
    setPlatform('android');
    const notificationId = 'id';
    const res = await apiModule.cancelDisplayedNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenCalledWith(
      [notificationId],
      1,
      null,
    );
  });

  test('cancelTriggerNotification - Android', async () => {
    setPlatform('android');
    const notificationId = 'id';
    const res = await apiModule.cancelTriggerNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenCalledWith([notificationId], 2, null);
  });

  describe('createChannel', () => {
    test('return empty string for iOS', async () => {
      setPlatform('ios');
      const channel: AndroidChannel = {
        id: 'channel-id',
        name: 'channel',
      };

      const res = await apiModule.createChannel(channel);

      expect(res).toBe('');
      expect(mockNotifeeNativeModule.createChannel).not.toHaveBeenCalled();
    });

    test('return channel id for Android', async () => {
      setPlatform('android');

      const channel: AndroidChannel = {
        id: 'channel-id',
        name: 'channel',
      };
      mockNotifeeNativeModule.createChannel.mockResolvedValue(channel);

      const res = await apiModule.createChannel(channel);

      expect(res).toBe(channel.id);
      expect(mockNotifeeNativeModule.createChannel).toHaveBeenCalledWith({
        badge: true,
        bypassDnd: false,
        id: 'channel-id',
        importance: 3,
        lights: true,
        name: 'channel',
        vibration: true,
        visibility: 0,
      });
    });
  });

  describe('isChannelBlocked', () => {
    test('on iOS', async () => {
      setPlatform('ios');
      const channel: AndroidChannel = {
        id: 'channel-id',
        name: 'channel',
      };

      const res = await apiModule.isChannelBlocked(channel.id);

      expect(res).toBe(false);
      expect(mockNotifeeNativeModule.createChannel).not.toHaveBeenCalled();
    });

    test('on Android', async () => {
      setPlatform('android');
      const channel: AndroidChannel = {
        id: 'channel-id',
        name: 'channel',
      };

      const res = await apiModule.isChannelBlocked(channel.id);

      expect(res).toBe(false);
      expect(mockNotifeeNativeModule.createChannel).not.toHaveBeenCalled();
    });
  });

  describe('isChannelCreated', () => {
    test('on iOS', async () => {
      setPlatform('ios');
      const channel: AndroidChannel = {
        id: 'channel-id',
        name: 'channel',
      };

      const res = await apiModule.isChannelCreated(channel.id);

      expect(res).toBe(true);
      expect(mockNotifeeNativeModule.createChannel).not.toHaveBeenCalled();
    });

    test('on Android', async () => {
      setPlatform('android');
      const channel: AndroidChannel = {
        id: 'channel-id',
        name: 'channel',
      };

      const res = await apiModule.isChannelCreated(channel.id);

      expect(res).toBe(true);
      expect(mockNotifeeNativeModule.createChannel).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationSettings', () => {
    describe('on Android', () => {
      beforeEach(() => {
        setPlatform('android');
      });

      test('return android settings with IOSNotificationSettings set to default values', async () => {
        mockNotifeeNativeModule.getNotificationSettings.mockResolvedValue({
          authorizationStatus: AuthorizationStatus.AUTHORIZED,
          android: {
            alarm: AndroidNotificationSetting.DISABLED,
          },
        });
        const settings = await apiModule.getNotificationSettings();
        expect(settings).toEqual({
          authorizationStatus: AuthorizationStatus.AUTHORIZED,
          android: {
            alarm: 0,
          },
          ios: {
            alert: 1,
            badge: 1,
            criticalAlert: 1,
            showPreviews: 1,
            sound: 1,
            carPlay: 1,
            lockScreen: 1,
            announcement: 1,
            notificationCenter: 1,
            inAppNotificationSettings: 1,
            authorizationStatus: AuthorizationStatus.AUTHORIZED,
          },
          web: {},
        });
      });
    });

    describe('on iOS', () => {
      beforeEach(() => {
        setPlatform('iOS');
      });

      test('return web settings with AndroidNotificationSettings set to default values', async () => {
        mockNotifeeNativeModule.getNotificationSettings.mockResolvedValue({
          authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
          ios: {
            alert: 1,
            badge: 1,
            criticalAlert: 1,
            showPreviews: 1,
            sound: 1,
            carPlay: 1,
            lockScreen: 1,
            announcement: 1,
            notificationCenter: 1,
            inAppNotificationSettings: 1,
            authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
          },
          web: {},
        });
        const settings = await apiModule.getNotificationSettings();
        expect(settings).toEqual({
          authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
          android: {
            alarm: AndroidNotificationSetting.ENABLED,
          },
          ios: {
            alert: 1,
            badge: 1,
            criticalAlert: 1,
            showPreviews: 1,
            sound: 1,
            carPlay: 1,
            lockScreen: 1,
            announcement: 1,
            notificationCenter: 1,
            inAppNotificationSettings: 1,
            authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
          },
          web: {},
        });
      });
    });
  });
});
