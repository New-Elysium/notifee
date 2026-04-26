import NotifeeApiModule from '../../packages/react-native/src/NotifeeApiModule';
import Notifee from '../../packages/react-native/src/index';
import { setPlatform } from './testSetup';
import { AppState } from 'react-native';

jest.mock('../../packages/react-native/src/NotifeeNativeModule');

const apiModule = new NotifeeApiModule({
  version: Notifee.SDK_VERSION,
  nativeModuleName: 'NotifeeApiModule',
  nativeEvents: [],
});

function setAppState(state: 'active' | 'background' | 'inactive' | 'unknown' | null) {
  Object.defineProperty(AppState, 'currentState', {
    get: () => state,
    configurable: true,
  });
}

describe('iOS lifecycle behavior', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    setPlatform('ios');
    setAppState('active');
    await apiModule.setFcmConfig({});
    await apiModule.setNotificationConfig({});
  });

  afterEach(async () => {
    await apiModule.setFcmConfig({});
    await apiModule.setNotificationConfig({});
  });

  describe('foreground event subscription semantics', () => {
    test('subscribes to foreground events and forwards payloads to the observer', () => {
      const remove = jest.fn();
      const addListenerSpy = jest
        .spyOn(apiModule.emitter, 'addListener')
        .mockImplementation((_eventName: string, listener: (event: any) => void) => {
          listener({
            type: 1,
            detail: {
              notification: {
                id: 'ios-foreground-press',
              },
              pressAction: {
                id: 'default',
              },
            },
          });

          return { remove } as any;
        });

      const observer = jest.fn();
      const unsubscribe = apiModule.onForegroundEvent(observer);

      expect(addListenerSpy).toHaveBeenCalledTimes(1);
      expect(observer).toHaveBeenCalledWith({
        type: 1,
        detail: {
          notification: {
            id: 'ios-foreground-press',
          },
          pressAction: {
            id: 'default',
          },
        },
      });

      unsubscribe();
      expect(remove).toHaveBeenCalledTimes(1);

      addListenerSpy.mockRestore();
    });

    test('throws when foreground observer is not a function', () => {
      expect(() => apiModule.onForegroundEvent(null as any)).toThrow(
        "notifee.onForegroundEvent(*) 'observer' expected a function.",
      );
    });

    test('accepts a valid background observer for iOS lifecycle handling', () => {
      const observer = jest.fn(async () => undefined);

      expect(() => apiModule.onBackgroundEvent(observer)).not.toThrow();
    });

    test('throws when background observer is not a function', () => {
      expect(() => apiModule.onBackgroundEvent(null as any)).toThrow(
        "notifee.onBackgroundEvent(*) 'observer' expected a function.",
      );
    });
  });

  describe('FCM ownership behavior on iOS', () => {
    test('does not display when app state is background', async () => {
      setAppState('background');

      const displaySpy = jest
        .spyOn(apiModule, 'displayNotification')
        .mockImplementation(async notification => notification.id ?? 'auto-id');

      const result = await apiModule.handleFcmMessage({
        messageId: 'ios-bg-msg',
        data: {
          notifee_options: JSON.stringify({
            _v: 1,
            title: 'Background title',
            body: 'Background body',
            ios: {},
          }),
        },
      });

      expect(result).toBeNull();
      expect(displaySpy).not.toHaveBeenCalled();

      displaySpy.mockRestore();
    });

    test('does not display when app state is inactive', async () => {
      setAppState('inactive');

      const displaySpy = jest
        .spyOn(apiModule, 'displayNotification')
        .mockImplementation(async notification => notification.id ?? 'auto-id');

      const result = await apiModule.handleFcmMessage({
        messageId: 'ios-inactive-msg',
        data: {
          notifee_options: JSON.stringify({
            _v: 1,
            title: 'Inactive title',
            body: 'Inactive body',
            ios: {},
          }),
        },
      });

      expect(result).toBeNull();
      expect(displaySpy).not.toHaveBeenCalled();

      displaySpy.mockRestore();
    });

    test('does not display when suppressForegroundBanner is enabled even if app is active', async () => {
      await apiModule.setFcmConfig({
        ios: {
          suppressForegroundBanner: true,
        },
      });

      const displaySpy = jest
        .spyOn(apiModule, 'displayNotification')
        .mockImplementation(async notification => notification.id ?? 'auto-id');

      const result = await apiModule.handleFcmMessage({
        messageId: 'ios-suppressed-msg',
        data: {
          notifee_options: JSON.stringify({
            _v: 1,
            title: 'Suppressed title',
            body: 'Suppressed body',
            ios: {},
          }),
        },
      });

      expect(result).toBeNull();
      expect(displaySpy).not.toHaveBeenCalled();

      displaySpy.mockRestore();
    });

    test('displays when app is active and foreground suppression is disabled', async () => {
      setAppState('active');

      const displaySpy = jest
        .spyOn(apiModule, 'displayNotification')
        .mockImplementation(async notification => notification.id ?? 'auto-id');

      const result = await apiModule.handleFcmMessage({
        messageId: 'ios-active-msg',
        data: {
          notifee_options: JSON.stringify({
            _v: 1,
            title: 'Active title',
            body: 'Active body',
            ios: {
              foregroundPresentationOptions: {
                banner: true,
                list: true,
                sound: true,
                badge: true,
              },
            },
          }),
        },
      });

      expect(result).toBe('ios-active-msg');
      expect(displaySpy).toHaveBeenCalledTimes(1);
      expect(displaySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ios-active-msg',
          title: 'Active title',
          body: 'Active body',
        }),
      );

      displaySpy.mockRestore();
    });

    test('warns when displaying an empty iOS notification payload', async () => {
      setAppState('active');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const displaySpy = jest
        .spyOn(apiModule, 'displayNotification')
        .mockImplementation(async notification => notification.id ?? 'auto-id');

      await apiModule.handleFcmMessage({
        messageId: 'ios-empty-msg',
        data: {
          notifee_options: JSON.stringify({
            _v: 1,
            ios: {},
          }),
        },
      });

      expect(warnSpy).toHaveBeenCalledWith(
        '[notifee] handleFcmMessage: displaying notification with empty title and body. Check your FCM payload.',
      );
      expect(displaySpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
      displaySpy.mockRestore();
    });
  });
});
