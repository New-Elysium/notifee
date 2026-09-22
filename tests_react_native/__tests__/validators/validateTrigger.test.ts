import validateTrigger from '../../../packages/react-native/src/validators/validateTrigger';
import {
  Trigger,
  TimestampTrigger,
  TriggerType,
  IntervalTrigger,
  TimeUnit,
  AlarmType,
  RepeatFrequency,
} from '../../../packages/react-native/src/types/Trigger';
import { setPlatform } from '../testSetup';

describe('Validate Trigger', () => {
  describe('validateTrigger()', () => {
    test('throws error if value is not an object', () => {
      // @ts-ignore
      expect(() => validateTrigger(null)).toThrow("'trigger' expected an object value.");

      // @ts-ignore
      expect(() => validateTrigger(undefined)).toThrow("'trigger' expected an object value.");

      // @ts-ignore
      expect(() => validateTrigger('string')).toThrow("'trigger' expected an object value.");

      // @ts-ignore
      expect(() => validateTrigger(1)).toThrow("'trigger' expected an object value.");
    });

    test('throws an error if trigger type is unknown', () => {
      // @ts-ignore
      const trigger: Trigger = { type: -1 };

      expect(() => validateTrigger(trigger)).toThrow('Unknown trigger type');
    });

    describe('validateTimestampTrigger()', () => {
      test('throws error if timestamp is invalid', () => {
        let trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          // @ts-ignore
          timestamp: null,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "trigger.timestamp' expected a number value.",
        );

        trigger = {
          type: TriggerType.TIMESTAMP,
          // @ts-ignore
          timestamp: '',
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "trigger.timestamp' expected a number value.",
        );
      });

      test('throws error when timestamp is in the past', () => {
        const date = new Date(Date.now());
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.timestamp' date must be in the future.",
        );
      });

      test('repeatFrequency defaults to -1 if not set', () => {
        const date = new Date(Date.now());
        date.setSeconds(date.getSeconds() + 10);
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
        };

        const $ = validateTrigger(trigger) as TimestampTrigger;

        expect($.repeatFrequency).toEqual(-1);
      });

      test('throws error if repeatFrequency is invalid', () => {
        const date = new Date(Date.now());
        date.setSeconds(date.getSeconds() + 10);

        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
          // @ts-ignore
          repeatFrequency: 4,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.repeatFrequency' expected a RepeatFrequency value.",
        );
      });

      test('accepts -1 for repeatFrequency when creating a timestamp trigger', () => {
        const date = new Date(Date.now());
        date.setSeconds(date.getSeconds() + 10);

        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
          repeatFrequency: -1,
        };

        const $ = validateTrigger(trigger) as TimestampTrigger;

        expect($.repeatFrequency).toEqual(-1);
        expect($.timestamp).toEqual(date.getTime());
      });

      test('returns a valid timestamp trigger object', () => {
        const date = new Date(Date.now());
        date.setSeconds(date.getSeconds() + 10);

        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: date.getTime(),
          repeatFrequency: 2,
        };

        const $ = validateTrigger(trigger) as TimestampTrigger;

        // expect($.).toEqual(date.getTime());
        expect($.repeatFrequency).toEqual(2);
        expect($.timestamp).toEqual(date.getTime());
      });

      describe('alarmManager', () => {
        test('ignores property when false', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: 2,
            alarmManager: false,
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          // expect($.).toEqual(date.getTime());
          expect($.repeatFrequency).toEqual(2);
          expect($.timestamp).toEqual(date.getTime());
          expect($.alarmManager).not.toBeDefined();
        });

        test('parses property to the default values', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: 2,
            alarmManager: true,
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          // expect($.).toEqual(date.getTime());
          expect($.repeatFrequency).toEqual(2);
          expect($.timestamp).toEqual(date.getTime());
          expect($.alarmManager).toEqual({ type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE });
        });

        test('parses deprecated property to an object with proper alarm type set', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: 2,
            alarmManager: {
              allowWhileIdle: true,
            },
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          // expect($.).toEqual(date.getTime());
          expect($.repeatFrequency).toEqual(2);
          expect($.timestamp).toEqual(date.getTime());
          expect($.alarmManager).toEqual({ type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE });
        });

        test('parses property to an object with proper alarm type set', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: 2,
            alarmManager: {
              type: AlarmType.SET_ALARM_CLOCK,
            },
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          // expect($.).toEqual(date.getTime());
          expect($.repeatFrequency).toEqual(2);
          expect($.timestamp).toEqual(date.getTime());
          expect($.alarmManager).toEqual({ type: AlarmType.SET_ALARM_CLOCK });
        });

        test('defaults to AlarmManager when unspecified', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          expect($.alarmManager).toEqual({ type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE });
        });

        test('respects alarmManager: false opt-out (WorkManager)', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            alarmManager: false,
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          expect($.alarmManager).toBeUndefined();
        });

        test('rejects MONTHLY when alarmManager is disabled', () => {
          setPlatform('android');
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.MONTHLY,
            alarmManager: false,
          };

          expect(() => validateTrigger(trigger)).toThrow(
            "'trigger.repeatFrequency' MONTHLY is not supported when 'trigger.alarmManager' is false.",
          );
        });

        test('accepts MONTHLY with AlarmManager on Android', () => {
          setPlatform('android');
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.MONTHLY,
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          expect($.repeatFrequency).toEqual(RepeatFrequency.MONTHLY);
          expect($.repeatInterval).toEqual(1);
          expect($.alarmManager).toEqual({ type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE });
        });

        test('rejects MONTHLY on iOS (not yet supported)', () => {
          setPlatform('ios');
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.MONTHLY,
          };

          expect(() => validateTrigger(trigger)).toThrow(
            "'trigger.repeatFrequency' MONTHLY is not yet supported on iOS.",
          );
        });

        test('defaults repeatInterval to 1 for repeating triggers', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.DAILY,
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          expect($.repeatInterval).toEqual(1);
        });

        test('accepts custom repeatInterval multipliers', () => {
          setPlatform('android');
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.WEEKLY,
            repeatInterval: 2,
          };

          const $ = validateTrigger(trigger) as TimestampTrigger;

          expect($.repeatInterval).toEqual(2);
        });

        test('throws if repeatInterval is used without repeatFrequency', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            // @ts-ignore
            repeatInterval: 2,
          };

          expect(() => validateTrigger(trigger)).toThrow(
            "'trigger.repeatInterval' requires a repeatFrequency value.",
          );
        });

        test('throws if repeatInterval is not a positive integer', () => {
          const date = new Date(Date.now());
          date.setSeconds(date.getSeconds() + 10);

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.DAILY,
            repeatInterval: 1.5,
          };

          expect(() => validateTrigger(trigger)).toThrow(
            "'trigger.repeatInterval' expected a positive integer value.",
          );
        });

        test('gives helpful errors for likely timestamp unit mistakes', () => {
          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: 15,
          };

          expect(() => validateTrigger(trigger)).toThrow(/day-of-month/);

          const secondsTrigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: 1735689600,
          };

          expect(() => validateTrigger(secondsTrigger)).toThrow(/seconds since epoch/);
        });
      });
    });

    describe('validateIntervalTrigger()', () => {
      test('throws error if interval is invalid', () => {
        let trigger: IntervalTrigger = {
          type: TriggerType.INTERVAL,
          // @ts-ignore
          interval: null,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "trigger.interval' expected a number value.",
        );

        trigger = {
          type: TriggerType.INTERVAL,
          // @ts-ignore
          interval: '',
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "trigger.interval' expected a number value.",
        );
      });

      test('defaults timeUnit to SECONDS if not set', () => {
        const trigger: IntervalTrigger = {
          type: TriggerType.INTERVAL,
          interval: 1000,
        };

        const $ = validateTrigger(trigger) as IntervalTrigger;

        expect($.type).toEqual(TriggerType.INTERVAL);
        expect($.timeUnit).toEqual(TimeUnit.SECONDS);
        expect($.interval).toEqual(1000);
      });

      test('throws error if timeUnit is invalid', () => {
        const trigger: IntervalTrigger = {
          type: TriggerType.INTERVAL,
          // @ts-ignore
          timeUnit: 'MONTHS',
          interval: 60,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.timeUnit' expected a TimeUnit value.",
        );
      });

      test('throws error if interval is less than 15 minutes', () => {
        let trigger: IntervalTrigger = {
          type: TriggerType.INTERVAL,
          timeUnit: TimeUnit.SECONDS,
          interval: 60,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.interval' expected to be at least 15 minutes.",
        );

        trigger = {
          type: TriggerType.INTERVAL,
          timeUnit: TimeUnit.MINUTES,
          interval: 12,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.interval' expected to be at least 15 minutes.",
        );

        trigger = {
          type: TriggerType.INTERVAL,
          timeUnit: TimeUnit.HOURS,
          interval: 0.5,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.interval' expected to be at least 15 minutes.",
        );

        trigger = {
          type: TriggerType.INTERVAL,
          timeUnit: TimeUnit.DAYS,
          interval: 0.5,
        };

        expect(() => validateTrigger(trigger)).toThrow(
          "'trigger.interval' expected to be at least 15 minutes.",
        );
      });

      test('returns a valid interval trigger object', () => {
        const date = new Date(Date.now());
        date.setSeconds(date.getSeconds() + 10);

        const trigger: IntervalTrigger = {
          type: TriggerType.INTERVAL,
          timeUnit: TimeUnit.DAYS,
          interval: 1,
        };

        const $ = validateTrigger(trigger) as IntervalTrigger;

        expect($.type).toEqual(TriggerType.INTERVAL);
        expect($.timeUnit).toEqual(TimeUnit.DAYS);
        expect($.interval).toEqual(1);
      });
    });
  });
});
