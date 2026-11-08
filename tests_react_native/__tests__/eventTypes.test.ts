import { EventType } from '../../packages/react-native/src/types/Notification';

describe('EventType wire contract', () => {
  test('foreground-service events keep their native parity values', () => {
    // These numeric values cross the native bridge (NotificationEvent.java /
    // NotifeeEventSubscriber.kt) — changing them is a breaking change for
    // native <-> JS event routing.
    expect(EventType.DISMISSED).toBe(0);
    expect(EventType.PRESS).toBe(1);
    expect(EventType.ACTION_PRESS).toBe(2);
    expect(EventType.DELIVERED).toBe(3);
    expect(EventType.FG_ALREADY_EXIST).toBe(8);
    expect(EventType.FG_TIMEOUT).toBe(9);
  });
});
