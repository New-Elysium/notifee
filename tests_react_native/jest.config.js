module.exports = {
  maxConcurrency: 30,
  // Don't use preset - we'll configure manually to avoid ESM issues
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|ts|tsx)$': ['babel-jest', { rootMode: 'upward' }],
  },
  rootDir: '..',
  testMatch: [
    '<rootDir>/tests_react_native/__tests__/**/*.test.ts',
    '<rootDir>/packages/react-native/plugin/__tests__/**/*.test.ts',
  ],
  modulePaths: ['node_modules', '<rootDir>/tests_react_native/node_modules'],
  collectCoverage: true,

  collectCoverageFrom: [
    '<rootDir>/packages/react-native/src/**/*.{ts,tsx}',
    '<rootDir>/packages/react-native/plugin/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],

  setupFiles: ['<rootDir>/tests_react_native/jest-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests_react_native/jest-mock.js'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@psync/notifee)/)',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
