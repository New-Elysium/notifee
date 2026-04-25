import { AppState } from 'react-native';
import NotifeeApiModule from '../../packages/react-native/src/NotifeeApiModule';
import * as Notifee from '../../packages/react-native/src';
import { setPlatform } from './testSetup';
import { parseFcmPayload } from '../../packages/react-native/src/fcm/parseFcmPayload';
import { reconstructNotification } from '../../packages/react-native/src/fcm/reconstructNotification';
import type { FcmRemoteMessage } from '../../packages/react-native/src/fcm/types';

jest.mock('../../packages/react-native/src/NotifeeNativeModule');

const apiModule = new NotifeeApiModule({
  version: Notifee.default.SDK_VERSION,
  nativeModuleName: 'NotifeeApiModule',
  nativeEvents: [],
});

function setAppState(state: 'active' | 'background' | 'inactive' | 'unknown' | null) {
  Object.defineProperty(AppState, 'currentState', {
    get: () => state,
    configurable: true,
  });
}

function makeMessage(overrides: Partial<FcmRemoteMessage> = {}): FcmRemoteMessage {
  return {
    messageId: 'msg-1',
    data: {
      notifee_options: JSON.stringify({
        _v: 1,
        title: 'Hello',
        body: 'World',
        android: { channelId: 'default' },
      }),
    },
    ...overrides,
  };
}

describe('handleFcmMessage', () => {
  let displaySpy: jest.SpyInstance;

  beforeEach(async () => {
    displaySpy = jest
      .spyOn(apiModule, 'displayNotification')
      .mockImplementation(async notification => notification.id ?? 'auto-id');
    setPlatform('android');
    setAppState('active');
    await apiModule.setFcmConfig({});
  });

  afterEach(async () => {
    displaySpy.mockRestore();
    await apiModule.setFcmConfig({});
  });

  it('displays on Android by default', async () => {
    const result = await apiModule.handleFcmMessage(makeMessage());

    expect(displaySpy).toHaveBeenCalledTimes(1);
    expect(result).toBe('msg-1');
  });

  it('returns null on iOS when app is not active', async () => {
    setPlatform('ios');
    setAppState('background');

    await expect(apiModule.handleFcmMessage(makeMessage())).resolves.toBeNull();
    expect(displaySpy).not.toHaveBeenCalled();
  });

  it('supports suppressing foreground iOS banners', async () => {
    setPlatform('ios');
    await apiModule.setFcmConfig({ ios: { suppressForegroundBanner: true } });

    await expect(apiModule.handleFcmMessage(makeMessage())).resolves.toBeNull();
    expect(displaySpy).not.toHaveBeenCalled();
  });

  it('supports ignoring fallback messages when no notifee payload exists', async () => {
    await apiModule.setFcmConfig({ fallbackBehavior: 'ignore' });

    await expect(
      apiModule.handleFcmMessage({
        messageId: 'fb-1',
        notification: { title: 'Ignored', body: 'Body' },
      }),
    ).resolves.toBeNull();
    expect(displaySpy).not.toHaveBeenCalled();
  });

  it('uses configured Android defaults during fallback reconstruction', async () => {
    await apiModule.setFcmConfig({
      defaultChannelId: 'fallback-channel',
      defaultPressAction: { id: 'default', launchActivity: 'default' },
    });

    await apiModule.handleFcmMessage({
      messageId: 'fb-2',
      notification: { title: 'Fallback title', body: 'Fallback body' },
    });

    expect(displaySpy).toHaveBeenCalledTimes(1);
    expect(displaySpy.mock.calls[0][0]).toMatchObject({
      id: 'fb-2',
      title: 'Fallback title',
      body: 'Fallback body',
      android: {
        channelId: 'fallback-channel',
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  });

  it('snapshots config for the current call', async () => {
    await apiModule.setFcmConfig({ defaultChannelId: 'before' });

    displaySpy.mockImplementation(async notification => {
      await apiModule.setFcmConfig({ defaultChannelId: 'after' });
      return notification.id ?? 'auto-id';
    });

    await apiModule.handleFcmMessage(
      makeMessage({
        data: {
          notifee_options: JSON.stringify({ _v: 1, title: 'a', body: 'b', android: {} }),
        },
      }),
    );

    expect(displaySpy.mock.calls[0][0].android.channelId).toBe('before');
  });

  it('parses payloads and warns on malformed notifee_options', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(parseFcmPayload({ notifee_options: '{broken' })).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[notifee] Failed to parse notifee_options'),
    );

    warn.mockRestore();
  });

  it('reconstructs data safely and strips reserved keys', () => {
    const notification = reconstructNotification(
      { _v: 1, title: 'a', body: 'b' },
      {
        data: {
          notifee_options: '{}',
          notifee_data: JSON.stringify({ notifee_options: 'leaked', safe: 'blob' }),
          safe: 'top',
        },
      },
      {},
    );

    expect(notification.data).toEqual({ safe: 'blob' });
    expect(notification.data?.notifee_options).toBeUndefined();
  });

  it('maps iOS attachments and validates interruption level defensively', () => {
    setPlatform('ios');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const notification = reconstructNotification(
      {
        _v: 1,
        title: 'a',
        body: 'b',
        ios: {
          interruptionLevel: 'urgent',
          attachments: [null, { url: 'https://x.com/a.png', identifier: 'att-1' }],
        },
      },
      {},
      {},
    );

    expect(notification.ios?.interruptionLevel).toBeUndefined();
    expect(notification.ios?.attachments).toEqual([{ url: 'https://x.com/a.png', id: 'att-1' }]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[notifee] Unknown ios.interruptionLevel 'urgent'. Ignored."),
    );

    warn.mockRestore();
  });
});
