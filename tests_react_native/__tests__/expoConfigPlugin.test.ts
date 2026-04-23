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
});
