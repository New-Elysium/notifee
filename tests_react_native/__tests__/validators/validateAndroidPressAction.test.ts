import validateAndroidPressAction from '../../../packages/react-native/src/validators/validateAndroidPressAction';
import { NotificationPressAction } from '../../../packages/react-native/src/types/Notification';

describe('Validate Android Press Action', () => {
  describe('validateAndroidPressAction()', () => {
    test('returns valid ', () => {
      const pressAction: NotificationPressAction = {
        id: 'id',
        launchActivity: 'launchActivity',
        mainComponent: 'mainComponent',
      };

      const $ = validateAndroidPressAction(pressAction);
      expect($.id).toEqual('id');
      expect($.launchActivity).toEqual('launchActivity');
      expect($.mainComponent).toEqual('mainComponent');
    });

    test('throws an error with an invalid param', () => {
      expect(() => validateAndroidPressAction([] as any)).toThrow(
        "'pressAction' expected an object value.",
      );
    });

    test('throws an error with an invalid id', () => {
      const pressAction: NotificationPressAction = {
        id: [] as any,
      };

      expect(() => validateAndroidPressAction(pressAction)).toThrow(
        "'id' expected a non-empty string value.",
      );
    });

    test('throws an error with an invalid launch activity', () => {
      const pressAction: NotificationPressAction = {
        id: 'id',
        launchActivity: {} as any,
      };

      expect(() => validateAndroidPressAction(pressAction)).toThrow(
        "'launchActivity' expected a string value.",
      );
    });

    test('throws an error with an invalid main component', () => {
      const pressAction: NotificationPressAction = {
        id: 'id',
        mainComponent: {} as any,
      };

      expect(() => validateAndroidPressAction(pressAction)).toThrow(
        "'mainComponent' expected a string value.",
      );
    });

    test('throws an error when the reserved opt-out id is used', () => {
      const pressAction: NotificationPressAction = {
        id: '__NOTIFEE_OPT_OUT__',
      };

      expect(() => validateAndroidPressAction(pressAction)).toThrow(
        "'id' is reserved for an explicit null pressAction.",
      );
    });

    test('defaults launchActivity when the id is the default press action', () => {
      const $ = validateAndroidPressAction({ id: 'default' });
      expect($.id).toEqual('default');
      expect($.launchActivity).toEqual('default');
    });

    test('does not default launchActivity for custom ids', () => {
      const $ = validateAndroidPressAction({ id: 'mark-as-read' });
      expect($.id).toEqual('mark-as-read');
      expect($.launchActivity).toBeUndefined();
    });
  });
});
