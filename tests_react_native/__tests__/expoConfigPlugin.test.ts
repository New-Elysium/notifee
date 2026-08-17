jest.mock(
  'react-native/Libraries/vendor/emitter/EventEmitter',
  () => {
    return jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
      removeListener: jest.fn(),
      emit: jest.fn(),
    }));
  },
  { virtual: true },
);

jest.mock(
  'react-native',
  () => {
    const mockModule = {
      addListener: () => jest.fn(),
      getConstants: () => ({ ANDROID_API_LEVEL: 33 }),
      ANDROID_API_LEVEL: 33,
    };

    return {
      NativeModules: {
        NotifeeApiModule: mockModule,
      },
      TurboModuleRegistry: {
        getEnforcing: jest.fn(() => mockModule),
      },
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(),
        removeListener: jest.fn(),
        emit: jest.fn(),
      })),
      Platform: {
        OS: 'android',
        Version: 123,
      },
      Image: {
        resolveAssetSource: jest.fn(source => source),
      },
      AppRegistry: {
        registerHeadlessTask: jest.fn(),
      },
      AppState: {
        currentState: 'active',
      },
    };
  },
  { virtual: true },
);

const withNotifee = require('../../packages/react-native/app.plugin');
const { normalizeProps, validateProps } = require('../../packages/react-native/plugin/utils');
const {
  setNotificationIconColor,
  setNotificationIconMetaData,
} = require('../../packages/react-native/plugin/android');

describe('Expo config plugin', () => {
  test('exports a plugin function', () => {
    expect(typeof withNotifee).toBe('function');
  });

  test('normalizes sensible defaults', () => {
    const normalized = normalizeProps(
      {
        ios: {
          appleTeamId: 'ABCDE12345',
          bundleIdentifier: 'dev.psync.notifee',
        },
      },
      {
        enableNotificationServiceExtension: true,
      },
    );

    expect(normalized.appleDevTeamId).toBe('ABCDE12345');
    expect(normalized.backgroundModes).toBeUndefined();
    expect(normalized.extensionName).toBe('NotifeeNotificationService');
    expect(normalized.extensionBundleIdentifier).toBe(
      'dev.psync.notifee.NotifeeNotificationService',
    );
    expect(normalized.appGroupName).toBe('group.dev.psync.notifee');
    expect(normalized.iosSoundFiles).toEqual([]);
  });

  test('supports nested service extension settings', () => {
    const normalized = normalizeProps(
      {
        ios: {
          appleTeamId: 'ABCDE12345',
          bundleIdentifier: 'dev.psync.notifee',
          deploymentTarget: '16.0',
        },
      },
      {
        enableNotificationServiceExtension: true,
        serviceExtensionSettings: {
          appGroupName: 'group.dev.psync.custom',
          bundleIdentifier: 'dev.psync.notifee.richpush',
          customSourceFilePath: './ios/NotificationService.m',
          deploymentTarget: '17.0',
          entitlements: {
            'com.apple.developer.networking.wifi-info': true,
          },
          infoPlist: {
            MyCustomKey: 'present',
          },
          name: 'RichPushExtension',
        },
      },
    );

    expect(normalized.enableNotificationServiceExtension).toBe(true);
    expect(normalized.extensionName).toBe('RichPushExtension');
    expect(normalized.extensionBundleIdentifier).toBe('dev.psync.notifee.richpush');
    expect(normalized.iosDeploymentTarget).toBe('17.0');
    expect(normalized.appGroupName).toBe('group.dev.psync.custom');
    expect(normalized.extensionEntitlements).toEqual({
      'com.apple.developer.networking.wifi-info': true,
    });
    expect(normalized.extensionInfoPlist).toEqual({
      MyCustomKey: 'present',
    });
  });

  test('extension settings do not enable the extension on their own', () => {
    const normalized = normalizeProps(
      {
        ios: {
          bundleIdentifier: 'dev.psync.notifee',
        },
      },
      {
        serviceExtensionSettings: {
          name: 'RichPushExtension',
        },
      },
    );

    expect(normalized.enableNotificationServiceExtension).toBe(false);
    expect(normalized.extensionName).toBe('RichPushExtension');
  });

  test('rejects the removed nested enabled flag', () => {
    const props = {
      enableNotificationServiceExtension: true,
      serviceExtensionSettings: {
        enabled: true,
      },
    };

    expect(() =>
      validateProps(
        normalizeProps({ ios: { bundleIdentifier: 'dev.psync.notifee' } }, props),
        props,
      ),
    ).toThrow(/enableNotificationServiceExtension/);
  });

  test('rejects the renamed notificationServiceExtension key', () => {
    const props = {
      notificationServiceExtension: {
        enabled: true,
      },
    };

    expect(() =>
      validateProps(
        normalizeProps({ ios: { bundleIdentifier: 'dev.psync.notifee' } }, props),
        props,
      ),
    ).toThrow(/serviceExtensionSettings/);
  });

  test('resolves android notification color from plugin props only', () => {
    const fromProps = normalizeProps({ ios: {} }, { androidNotificationColor: '#ffffff' });
    expect(fromProps.androidNotificationColor).toBe('#ffffff');

    // No fallback to the Expo `notification.color` config — notifee is the source of truth.
    const ignored = normalizeProps({ ios: {}, notification: { color: '#00ff00' } }, {});
    expect(ignored.androidNotificationColor).toBe(null);

    const unset = normalizeProps({ ios: {} }, {});
    expect(unset.androidNotificationColor).toBe(null);
  });

  test('rejects invalid android notification colors', () => {
    expect(() =>
      validateProps(
        normalizeProps(
          { ios: { bundleIdentifier: 'dev.psync.notifee' } },
          {
            androidNotificationColor: 'white',
          },
        ),
      ),
    ).toThrow(/androidNotificationColor/);
  });

  test('writes notification_icon_color into colors.xml resource xml', () => {
    const result = setNotificationIconColor({ resources: {} }, '#ffffff');

    expect(result.resources.color).toEqual([
      { $: { name: 'notification_icon_color' }, _: '#ffffff' },
    ]);
  });

  test('resolves android notification icon from plugin props only', () => {
    const fromProps = normalizeProps({ ios: {} }, { androidNotificationIcon: './assets/icon.png' });
    expect(fromProps.androidNotificationIcon).toBe('./assets/icon.png');

    const unset = normalizeProps({ ios: {} }, {});
    expect(unset.androidNotificationIcon).toBe(null);
  });

  test('rejects non-string android notification icons', () => {
    expect(() =>
      validateProps(
        normalizeProps(
          { ios: { bundleIdentifier: 'dev.psync.notifee' } },
          { androidNotificationIcon: 123 as any },
        ),
      ),
    ).toThrow(/androidNotificationIcon/);
  });

  test('adds FCM default notification icon meta-data to the manifest', () => {
    const manifest = {
      manifest: { application: [{ $: { 'android:name': '.MainApplication' } }] },
    };

    const result = setNotificationIconMetaData(manifest, '@drawable/notification_icon');

    expect(result.manifest.application[0]['meta-data']).toEqual([
      {
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_icon',
          'android:resource': '@drawable/notification_icon',
        },
      },
    ]);
  });

  test('replaces an existing FCM notification icon meta-data item in place', () => {
    const manifest = {
      manifest: {
        application: [
          {
            $: { 'android:name': '.MainApplication' },
            'meta-data': [
              {
                $: {
                  'android:name': 'com.google.firebase.messaging.default_notification_icon',
                  'android:resource': '@drawable/old_icon',
                },
              },
            ],
          },
        ],
      },
    };

    const result = setNotificationIconMetaData(manifest, '@drawable/notification_icon');
    const items = result.manifest.application[0]['meta-data'];

    expect(items).toHaveLength(1);
    expect(items[0].$['android:resource']).toBe('@drawable/notification_icon');
  });

  test('warns when the derived app group is not declared in ios.entitlements', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      withNotifee(
        {
          ios: { bundleIdentifier: 'dev.psync.notifee' },
        },
        { enableNotificationServiceExtension: true },
      );

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('group.dev.psync.notifee');
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('does not warn when the app group is declared in ios.entitlements', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      withNotifee(
        {
          ios: {
            bundleIdentifier: 'dev.psync.notifee',
            entitlements: {
              'com.apple.security.application-groups': ['group.dev.psync.notifee'],
            },
          },
        },
        { enableNotificationServiceExtension: true },
      );

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('does not warn about app groups when the extension is disabled', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      withNotifee(
        {
          ios: { bundleIdentifier: 'dev.psync.notifee' },
        },
        {},
      );

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('keeps explicit background modes opt-in', () => {
    const normalized = normalizeProps(
      {
        ios: {
          bundleIdentifier: 'dev.psync.notifee',
        },
      },
      {
        backgroundModes: ['remote-notification'],
      },
    );

    expect(normalized.backgroundModes).toEqual(['remote-notification']);
  });

  test('rejects invalid APS environment values', () => {
    expect(() =>
      validateProps(
        normalizeProps(
          { ios: { bundleIdentifier: 'dev.psync.notifee' } },
          { apsEnvMode: 'staging' },
        ),
      ),
    ).toThrow(/apsEnvMode/);
  });

  test('requires bundle identifier when extension automation is enabled', () => {
    expect(() =>
      validateProps(
        normalizeProps(
          {
            ios: {},
          },
          {
            enableNotificationServiceExtension: true,
          },
        ),
      ),
    ).toThrow(/bundleIdentifier/);
  });

  test('rejects invalid android sound file entries', () => {
    expect(() =>
      validateProps(
        normalizeProps(
          { ios: { bundleIdentifier: 'dev.psync.notifee' } },
          {
            androidSoundFiles: [{ name: 'My Sound', path: './assets/chime.wav' }],
          },
        ),
      ),
    ).toThrow(/androidSoundFiles|Android sound/);
  });

  test('rejects invalid ios sound file entries', () => {
    expect(() =>
      validateProps(
        normalizeProps(
          { ios: { bundleIdentifier: 'dev.psync.notifee' } },
          { iosSoundFiles: ['ding.mp3', ''] },
        ),
      ),
    ).toThrow(/iosSoundFiles/);
  });
});
