import Notifee from '../../packages/react-native/src/index';

describe('Notifee App Module', () => {
  test('Module is defined on import', () => {
    expect(Notifee).toBeDefined();
  });
  test('Version from module package.json matches SDK_VERSION', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notifeePackageJSON = require('../../packages/react-native/package.json');
    expect(Notifee.SDK_VERSION).toEqual(notifeePackageJSON.version);
  });
});
