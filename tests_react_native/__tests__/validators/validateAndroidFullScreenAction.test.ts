import { NotificationFullScreenAction } from '../../../packages/react-native/src/types/Notification';
import validateAndroidFullScreenAction from '../../../packages/react-native/src/validators/validateAndroidFullScreenAction';

describe('Validate Android Full-screen Action', () => {
  describe('validateAndroidFullScreenAction()', () => {
    test('returns valid ', () => {
      const action: NotificationFullScreenAction = {
        id: 'id',
        launchActivity: 'launchActivity',
        mainComponent: 'mainComponent',
      };

      const $ = validateAndroidFullScreenAction(action);
      expect($.id).toEqual('id');
      expect($.launchActivity).toEqual('launchActivity');
      expect($.mainComponent).toEqual('mainComponent');
    });

    test('throws an error with an invalid param', () => {
      expect(() => validateAndroidFullScreenAction([] as any)).toThrow(
        "'fullScreenAction' expected an object value.",
      );
    });

    test('throws an error with an invalid id', () => {
      const action: NotificationFullScreenAction = {
        id: [] as any,
      };

      expect(() => validateAndroidFullScreenAction(action)).toThrow(
        "'id' expected a non-empty string value.",
      );
    });

    test('throws an error with an invalid launch activity', () => {
      const action: NotificationFullScreenAction = {
        id: 'id',
        launchActivity: {} as any,
      };

      expect(() => validateAndroidFullScreenAction(action)).toThrow(
        "'launchActivity' expected a string value.",
      );
    });

    test('throws an error with an invalid launch activity flags', () => {
      const action: any = {
        id: 'id',
        launchActivity: 'a-launch-activity',
        launchActivityFlags: '' as any,
      };

      expect(() => validateAndroidFullScreenAction(action)).toThrow(
        "'launchActivityFlags' must be an array of `AndroidLaunchActivityFlag` values.",
      );
    });

    test('throws an error with an invalid main component', () => {
      const action: NotificationFullScreenAction = {
        id: 'id',
        mainComponent: {} as any,
      };

      expect(() => validateAndroidFullScreenAction(action)).toThrow(
        "'mainComponent' expected a string value.",
      );
    });
  });
});
