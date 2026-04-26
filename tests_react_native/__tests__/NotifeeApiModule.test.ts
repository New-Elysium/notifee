// @ts-ignore
import NotifeeApiModule, {
  getNotificationConfig,
} from '../../packages/react-native/src/NotifeeApiModule';
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
    setPlatform('android');
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIds).toHaveBeenNthCalledWith(1, [
      'id',
    ]);
  });

  test('cancelDisplayedNotifications(ids) - iOS', async () => {
    setPlatform('ios');
    const res = await apiModule.cancelDisplayedNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelDisplayedNotificationsWithIds).toHaveBeenNthCalledWith(1, [
      'id',
    ]);
  });

  test('cancelTriggerNotifications(ids) - iOS', async () => {
    setPlatform('ios');
    const res = await apiModule.cancelTriggerNotifications(['id']);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelTriggerNotificationsWithIds).toHaveBeenNthCalledWith(1, [
      'id',
    ]);
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
    expect(mockNotifeeNativeModule.cancelDisplayedNotification).toHaveBeenCalledWith(
      notificationId,
    );
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
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIdsAndroid).toHaveBeenNthCalledWith(
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
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIdsAndroid).toHaveBeenNthCalledWith(
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
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIdsAndroid).toHaveBeenNthCalledWith(
      1,
      ['id'],
      2,
      null,
    );
  });

  test('cancelNotification - Android', async () => {
    setPlatform('android');
    const notificationId = 'id';
    const res = await apiModule.cancelNotification(notificationId);

    expect(res).toBe(undefined);
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIdsAndroid).toHaveBeenCalledWith(
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
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIdsAndroid).toHaveBeenCalledWith(
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
    expect(mockNotifeeNativeModule.cancelAllNotificationsWithIdsAndroid).toHaveBeenCalledWith(
      [notificationId],
      2,
      null,
    );
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

  describe('setFcmConfig', () => {
    test('throws when config is null', () => {
      expect(() => apiModule.setFcmConfig(null as any)).toThrow(
        'notifee.setFcmConfig(*) config must be a plain object. Got: null',
      );
    });

    test('throws when config is an array', () => {
      expect(() => apiModule.setFcmConfig([] as any)).toThrow(
        'notifee.setFcmConfig(*) config must be a plain object. Got: array',
      );
    });

    test('stores a cloned config snapshot', async () => {
      const config = {
        defaultChannelId: 'default-channel',
        defaultPressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        ios: {
          suppressForegroundBanner: true,
        },
      };

      await apiModule.setFcmConfig(config);

      config.defaultPressAction.id = 'mutated';
      config.ios.suppressForegroundBanner = false;

      const displaySpy = jest
        .spyOn(apiModule, 'displayNotification')
        .mockImplementation(async notification => notification.id ?? 'auto-id');

      await apiModule.handleFcmMessage({
        messageId: 'msg-config-clone',
        notification: {
          title: 'Fallback title',
          body: 'Fallback body',
        },
      });

      expect(displaySpy).toHaveBeenCalledWith({
        id: 'msg-config-clone',
        title: 'Fallback title',
        body: 'Fallback body',
        android: {
          channelId: 'default-channel',
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });

      displaySpy.mockRestore();
    });
  });

  describe('setNotificationConfig', () => {
    test('throws when config is null', () => {
      expect(() => apiModule.setNotificationConfig(null as any)).toThrow(
        'notifee.setNotificationConfig(*) config must be a plain object. Got: null',
      );
    });

    test('throws when config is an array', () => {
      expect(() => apiModule.setNotificationConfig([] as any)).toThrow(
        'notifee.setNotificationConfig(*) config must be a plain object. Got: array',
      );
    });

    test('passes a cloned config to native', async () => {
      setPlatform('ios');
      const config = {
        ios: {
          interceptRemoteNotifications: false,
        },
      };

      await apiModule.setNotificationConfig(config);

      expect(mockNotifeeNativeModule.setNotificationConfig).toHaveBeenCalledTimes(1);
      expect(mockNotifeeNativeModule.setNotificationConfig).toHaveBeenCalledWith({
        ios: {
          interceptRemoteNotifications: false,
        },
      });
      expect(mockNotifeeNativeModule.setNotificationConfig.mock.calls[0][0]).not.toBe(config);
      expect(mockNotifeeNativeModule.setNotificationConfig.mock.calls[0][0].ios).not.toBe(
        config.ios,
      );
    });

    test('stores a cloned config in the getter', async () => {
      setPlatform('ios');
      const config = {
        ios: {
          interceptRemoteNotifications: false,
        },
      };

      await apiModule.setNotificationConfig(config);

      const storedConfig = getNotificationConfig();

      expect(storedConfig).toEqual({
        ios: {
          interceptRemoteNotifications: false,
        },
      });
      expect(storedConfig).not.toBe(config);
      expect(storedConfig.ios).not.toBe(config.ios);
    });

    test('passes through undefined ios config without mutation', async () => {
      const config = {};

      await apiModule.setNotificationConfig(config);

      expect(mockNotifeeNativeModule.setNotificationConfig).toHaveBeenCalledTimes(1);
      expect(mockNotifeeNativeModule.setNotificationConfig).toHaveBeenCalledWith({});
      expect(mockNotifeeNativeModule.setNotificationConfig.mock.calls[0][0]).not.toBe(config);
    });
  });

  describe('getInitialNotification', () => {
    test('returns native initial notification on Android', async () => {
      setPlatform('android');
      const initialNotification = {
        notification: {
          id: 'notification-id',
          data: {
            foo: 'bar',
          },
        },
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      };

      mockNotifeeNativeModule.getInitialNotification.mockResolvedValue(initialNotification);

      const res = await apiModule.getInitialNotification();

      expect(res).toEqual(initialNotification);
      expect(mockNotifeeNativeModule.getInitialNotification).toHaveBeenCalledTimes(1);
    });

    test('returns native initial notification on iOS', async () => {
      setPlatform('ios');
      const initialNotification = {
        notification: {
          id: 'notification-id',
        },
        pressAction: {
          id: 'default',
        },
        initialNotification: true,
      };

      mockNotifeeNativeModule.getInitialNotification.mockResolvedValue(initialNotification);

      const res = await apiModule.getInitialNotification();

      expect(res).toEqual(initialNotification);
      expect(mockNotifeeNativeModule.getInitialNotification).toHaveBeenCalledTimes(1);
    });

    test('returns null on unsupported platforms', async () => {
      setPlatform('web');
      const res = await apiModule.getInitialNotification();

      expect(res).toBeNull();
      expect(mockNotifeeNativeModule.getInitialNotification).not.toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    test('onBackgroundEvent throws when observer is not a function', () => {
      expect(() => apiModule.onBackgroundEvent(null as any)).toThrow(
        "notifee.onBackgroundEvent(*) 'observer' expected a function.",
      );
    });

    test('onBackgroundEvent accepts a valid observer', () => {
      const observer = jest.fn(async () => undefined);

      expect(() => apiModule.onBackgroundEvent(observer)).not.toThrow();
    });

    test('onForegroundEvent throws when observer is not a function', () => {
      expect(() => apiModule.onForegroundEvent(null as any)).toThrow(
        "notifee.onForegroundEvent(*) 'observer' expected a function.",
      );
    });

    test('onForegroundEvent subscribes and unsubscribes correctly', () => {
      const remove = jest.fn();
      const addListenerSpy = jest.spyOn(apiModule.emitter, 'addListener').mockReturnValue({
        remove,
      } as any);

      const observer = jest.fn();
      const unsubscribe = apiModule.onForegroundEvent(observer);

      expect(addListenerSpy).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      expect(remove).toHaveBeenCalledTimes(1);
      addListenerSpy.mockRestore();
    });
  });

  describe('android utility methods', () => {
    test('openAlarmPermissionSettings calls native on Android', async () => {
      setPlatform('android');

      await apiModule.openAlarmPermissionSettings();

      expect(mockNotifeeNativeModule.openAlarmPermissionSettings).toHaveBeenCalledTimes(1);
    });

    test('openAlarmPermissionSettings resolves on non-Android', async () => {
      setPlatform('ios');

      await expect(apiModule.openAlarmPermissionSettings()).resolves.toBeUndefined();
      expect(mockNotifeeNativeModule.openAlarmPermissionSettings).not.toHaveBeenCalled();
    });

    test('openBatteryOptimizationSettings calls native on Android', async () => {
      setPlatform('android');

      await apiModule.openBatteryOptimizationSettings();

      expect(mockNotifeeNativeModule.openBatteryOptimizationSettings).toHaveBeenCalledTimes(1);
    });

    test('openBatteryOptimizationSettings resolves on non-Android', async () => {
      setPlatform('ios');

      await expect(apiModule.openBatteryOptimizationSettings()).resolves.toBeUndefined();
      expect(mockNotifeeNativeModule.openBatteryOptimizationSettings).not.toHaveBeenCalled();
    });

    test('getPowerManagerInfo returns native value on Android', async () => {
      setPlatform('android');
      mockNotifeeNativeModule.getPowerManagerInfo.mockResolvedValue({
        manufacturer: 'xiaomi',
        model: 'activity-name',
      });

      const res = await apiModule.getPowerManagerInfo();

      expect(res).toEqual({
        manufacturer: 'xiaomi',
        model: 'activity-name',
      });
      expect(mockNotifeeNativeModule.getPowerManagerInfo).toHaveBeenCalledTimes(1);
    });

    test('getPowerManagerInfo returns defaults on non-Android', async () => {
      setPlatform('ios');

      const res = await apiModule.getPowerManagerInfo();

      expect(res).toEqual({
        manufacturer: expect.any(String),
        activity: null,
      });
      expect(mockNotifeeNativeModule.getPowerManagerInfo).not.toHaveBeenCalled();
    });

    test('openPowerManagerSettings calls native on Android', async () => {
      setPlatform('android');

      await apiModule.openPowerManagerSettings();

      expect(mockNotifeeNativeModule.openPowerManagerSettings).toHaveBeenCalledTimes(1);
    });

    test('openPowerManagerSettings resolves on non-Android', async () => {
      setPlatform('ios');

      await expect(apiModule.openPowerManagerSettings()).resolves.toBeUndefined();
      expect(mockNotifeeNativeModule.openPowerManagerSettings).not.toHaveBeenCalled();
    });

    test('stopForegroundService calls native on Android', async () => {
      setPlatform('android');

      await apiModule.stopForegroundService();

      expect(mockNotifeeNativeModule.stopForegroundService).toHaveBeenCalledTimes(1);
    });

    test('stopForegroundService resolves on non-Android', async () => {
      setPlatform('ios');

      await expect(apiModule.stopForegroundService()).resolves.toBeUndefined();
      expect(mockNotifeeNativeModule.stopForegroundService).not.toHaveBeenCalled();
    });

    test('hideNotificationDrawer calls native on Android', () => {
      setPlatform('android');

      apiModule.hideNotificationDrawer();

      expect(mockNotifeeNativeModule.hideNotificationDrawer).toHaveBeenCalledTimes(1);
    });

    test('hideNotificationDrawer is a no-op on non-Android', () => {
      setPlatform('ios');

      apiModule.hideNotificationDrawer();

      expect(mockNotifeeNativeModule.hideNotificationDrawer).not.toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    test('returns Android-shaped settings on Android', async () => {
      setPlatform('android');
      mockNotifeeNativeModule.requestPermission.mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
        android: {
          alarm: AndroidNotificationSetting.ENABLED,
        },
      });

      const res = await apiModule.requestPermission();

      expect(res).toEqual({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
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
          authorizationStatus: AuthorizationStatus.AUTHORIZED,
        },
        web: {},
      });
      expect(mockNotifeeNativeModule.requestPermission).toHaveBeenCalledWith({});
    });

    test('returns web defaults on unsupported platforms', async () => {
      setPlatform('web');

      const res = await apiModule.requestPermission();

      expect(res).toEqual({
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
      expect(mockNotifeeNativeModule.requestPermission).not.toHaveBeenCalled();
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
