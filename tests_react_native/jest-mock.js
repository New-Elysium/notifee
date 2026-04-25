/* eslint-disable no-undef */

// Mock React Native internal modules with Flow types before they are imported
jest.mock('react-native/Libraries/vendor/emitter/EventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    emit: jest.fn(),
  }));
}, { virtual: true });

// Mock react-native
jest.mock('react-native', () => {
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
      resolveAssetSource: jest.fn((source) => source),
    },
    AppRegistry: {
      registerHeadlessTask: jest.fn(),
    },
    AppState: {
      currentState: 'active',
    },
  };
});
