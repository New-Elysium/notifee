import validateIOSCategoryAction from '../../../packages/react-native/src/validators/validateIOSCategoryAction';
import { IOSNotificationCategoryAction } from '../../../packages/react-native/src/types/NotificationIOS';

describe('Validate IOS Catgeory Action', () => {
  describe('validateIOSCategoryAction()', () => {
    test('returns valid ', () => {
      const categoryAction: IOSNotificationCategoryAction = {
        id: 'id',
        title: 'title',
        input: true,
      };

      const $ = validateIOSCategoryAction(categoryAction);
      expect($.id).toEqual('id');
      expect($.title).toEqual('title');
      expect($.input).toEqual(true);
    });

    test('throws an error with an invalid input param', () => {
      const categoryAction: IOSNotificationCategoryAction = {
        id: 'id',
        title: 'title',
        input: [] as any,
      };

      expect(() => validateIOSCategoryAction(categoryAction)).toThrow(
        "'action' expected an object value..",
      );
    });

    test('throws an error with an invalid destructive param', () => {
      const categoryAction: IOSNotificationCategoryAction = {
        id: 'id',
        title: 'title',
        destructive: [] as any,
      };

      expect(() => validateIOSCategoryAction(categoryAction)).toThrow(
        "'destructive' expected a boolean value.",
      );
    });

    test('throws an error with an invalid foreground param', () => {
      const categoryAction: IOSNotificationCategoryAction = {
        id: 'id',
        title: 'title',
        foreground: [] as any,
      };

      expect(() => validateIOSCategoryAction(categoryAction)).toThrow(
        "'foreground' expected a boolean value.",
      );
    });

    test('throws an error with an invalid authenticationRequired param', () => {
      const categoryAction: IOSNotificationCategoryAction = {
        id: 'id',
        title: 'title',
        authenticationRequired: [] as any,
      };

      expect(() => validateIOSCategoryAction(categoryAction)).toThrow(
        "'authenticationRequired' expected a boolean value.",
      );
    });
  });
});
