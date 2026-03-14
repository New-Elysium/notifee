/**
 * Custom Jest setup for React Native 0.83+ compatibility
 * This replaces the ESM-based setup from react-native/jest/setup.js
 */

'use strict';

// Set up React Native test environment globals
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

// Set up __DEV__ global
Object.defineProperties(global, {
  __DEV__: {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  },
  cancelAnimationFrame: {
    configurable: true,
    enumerable: true,
    value: (callback) => clearTimeout(setTimeout(callback, 0)),
    writable: true,
  },
  requestAnimationFrame: {
    configurable: true,
    enumerable: true,
    value: (callback) => setTimeout(callback, 0),
    writable: true,
  },
});

// Mock the ErrorUtils global that React Native expects
global.ErrorUtils = {
  reportFatalError: (error) => {
    console.error('Fatal Error:', error);
  },
  reportError: (error) => {
    console.error('Error:', error);
  },
  setGlobalHandler: () => {},
  getGlobalHandler: () => () => {},
};

// Mock common React Native globals
if (typeof window === 'undefined') {
  global.window = global;
}
