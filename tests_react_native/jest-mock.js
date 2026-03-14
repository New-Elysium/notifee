/* eslint-disable no-undef */

// Mock React Native internal modules with Flow types before they are imported
jest.mock('react-native/Libraries/vendor/emitter/EventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    emit: jest.fn(),
  }));
});

// Mock react-native
jest.mock('react-native', () => {
  return {
    NativeModules: {
      NotifeeApiModule: {
        addListener: () => jest.fn(),
      },
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
  };
});
