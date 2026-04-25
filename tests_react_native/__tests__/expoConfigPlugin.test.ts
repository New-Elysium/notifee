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
const {
  normalizeProps,
  validateProps,
} = require('../../packages/react-native/plugin/utils');

describe('Expo config plugin', () => {
  test('exports a plugin function', () => {
    expect(typeof withNotifee).toBe('function');
  });

  test('normalizes sensible defaults', () => {
    const normalized = normalizeProps(
      {
        ios: {
          bundleIdentifier: 'dev.psync.notifee',
        },
      },
      {
        enableNotificationServiceExtension: true,
      },
    );

    expect(normalized.backgroundModes).toEqual(['remote-notification']);
    expect(normalized.extensionName).toBe('NotifeeNotificationService');
    expect(normalized.extensionBundleIdentifier).toBe(
      'dev.psync.notifee.NotifeeNotificationService',
    );
    expect(normalized.appGroupName).toBe('group.dev.psync.notifee.notifee');
    expect(normalized.iosSoundFiles).toEqual([]);
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
