import mock from '@psync/notifee/jest-mock';

// To disable warning  Animated: `useNativeDriver` is not supported because the native animated module is missing.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@psync/notifee', () => mock);
