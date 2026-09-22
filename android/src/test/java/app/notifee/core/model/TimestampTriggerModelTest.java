package app.notifee.core.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import android.os.Bundle;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public class TimestampTriggerModelTest {
  private static Bundle timestampTriggerBundle(long timestamp, int repeatFrequency) {
    Bundle trigger = new Bundle();
    trigger.putLong("timestamp", timestamp);
    trigger.putInt("repeatFrequency", repeatFrequency);
    return trigger;
  }

  private static Bundle alarmManagerBundle(Bundle trigger, Integer type) {
    Bundle alarmManager = new Bundle();
    if (type != null) {
      alarmManager.putInt("type", type);
    }
    trigger.putBundle("alarmManager", alarmManager);
    return trigger;
  }

  @Test
  public void testBundleValues() {
    Bundle trigger = new Bundle();
    Bundle triggerComponents = new Bundle();
    triggerComponents.putInt("minute", 1);
    triggerComponents.putInt("hour", 1);
    triggerComponents.putInt("day", 1);
    triggerComponents.putInt("month", 12);
    triggerComponents.putInt("weekday", 3);
    triggerComponents.putInt("weekdayOrdinal", 2);
    trigger.putBundle("components", triggerComponents);

    TimestampTriggerModel model = TimestampTriggerModel.fromBundle(trigger);

    assertEquals(
        "with no 'repeatFrequency', interval should be -1", -1, model.getInterval());
    assertNull(
        "with no 'repeatFrequency', TimeUnit should be null", model.getTimeUnit());
    assertEquals(
        "with no 'repeatFrequency', delay should be 0", 0, model.getDelay());
  }

  @Test
  public void monthlyRepeat_parsesWithoutWorkManagerInterval() {
    long timestamp = System.currentTimeMillis() + 60_000;
    TimestampTriggerModel model =
        TimestampTriggerModel.fromBundle(timestampTriggerBundle(timestamp, 3));

    assertEquals(TimestampTriggerModel.MONTHLY, model.getRepeatFrequency());
    assertEquals(-1, model.getInterval());
    assertNull(model.getTimeUnit());
  }

  @Test
  public void repeatInterval_multipliesWorkManagerInterval() {
    long timestamp = System.currentTimeMillis() + 60_000;

    Bundle daily = timestampTriggerBundle(timestamp, 1);
    daily.putInt("repeatInterval", 2);
    TimestampTriggerModel dailyModel = TimestampTriggerModel.fromBundle(daily);
    assertEquals(2, dailyModel.getInterval());
    assertEquals(java.util.concurrent.TimeUnit.DAYS, dailyModel.getTimeUnit());

    Bundle weekly = timestampTriggerBundle(timestamp, 2);
    weekly.putInt("repeatInterval", 3);
    TimestampTriggerModel weeklyModel = TimestampTriggerModel.fromBundle(weekly);
    assertEquals(21, weeklyModel.getInterval());
    assertEquals(java.util.concurrent.TimeUnit.DAYS, weeklyModel.getTimeUnit());

    Bundle hourly = timestampTriggerBundle(timestamp, 0);
    hourly.putInt("repeatInterval", 6);
    TimestampTriggerModel hourlyModel = TimestampTriggerModel.fromBundle(hourly);
    assertEquals(6, hourlyModel.getInterval());
    assertEquals(java.util.concurrent.TimeUnit.HOURS, hourlyModel.getTimeUnit());
  }

  @Test
  public void repeatInterval_invalidValuesFallBackToOne() {
    long timestamp = System.currentTimeMillis() + 60_000;
    Bundle trigger = timestampTriggerBundle(timestamp, 1);
    trigger.putDouble("repeatInterval", 1.5);
    assertEquals(1, TimestampTriggerModel.fromBundle(trigger).getInterval());

    Bundle zero = timestampTriggerBundle(timestamp, 1);
    zero.putInt("repeatInterval", 0);
    assertEquals(1, TimestampTriggerModel.fromBundle(zero).getInterval());
  }

  @Test
  public void alarmManager_withoutType_defaultsToExactAndAllowWhileIdle() {
    long timestamp = System.currentTimeMillis() + 60_000;
    Bundle trigger = alarmManagerBundle(timestampTriggerBundle(timestamp, -1), null);

    assertEquals(true, TimestampTriggerModel.fromBundle(trigger).getWithAlarmManager());
    assertEquals(
        TimestampTriggerModel.AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        TimestampTriggerModel.fromBundle(trigger).getAlarmType());
  }

  @Test
  public void alarmManager_withExplicitType_respectsIt() {
    long timestamp = System.currentTimeMillis() + 60_000;
    Bundle trigger = alarmManagerBundle(timestampTriggerBundle(timestamp, -1), 0);

    assertEquals(
        TimestampTriggerModel.AlarmType.SET,
        TimestampTriggerModel.fromBundle(trigger).getAlarmType());
  }

  @Test
  public void withoutAlarmManager_usesWorkManager() {
    long timestamp = System.currentTimeMillis() + 60_000;
    TimestampTriggerModel model =
        TimestampTriggerModel.fromBundle(timestampTriggerBundle(timestamp, -1));

    assertEquals(false, model.getWithAlarmManager());
  }

  @Test
  public void setNextTimestamp_monthlyAdvancesAndClampsShortMonths() {
    // Jan 31 2025 10:00 local — a day that does not exist in shorter months
    ZoneId zoneId = ZoneId.systemDefault();
    ZonedDateTime start = ZonedDateTime.of(2025, 1, 31, 10, 0, 0, 0, zoneId);
    Bundle trigger = timestampTriggerBundle(start.toInstant().toEpochMilli(), 3);
    TimestampTriggerModel model = TimestampTriggerModel.fromBundle(trigger);

    model.setNextTimestamp();

    ZonedDateTime next = Instant.ofEpochMilli(model.getTimestamp()).atZone(zoneId);
    // Advancement always lands in the future, preserving wall-clock time. Calendar
    // semantics are "sticky clamp": Jan 31 + 1 month lands on Feb 28, and further
    // advances continue from the 28th (matching Calendar.add / plusMonths).
    org.junit.Assert.assertTrue(next.toInstant().isAfter(java.time.Instant.now()));
    assertEquals(10, next.getHour());
    assertEquals(28, next.getDayOfMonth());
  }

  @Test
  public void setNextTimestamp_dailyWithInterval_skipsIntervalDays() {
    ZoneId zoneId = ZoneId.systemDefault();
    ZonedDateTime start = ZonedDateTime.of(2025, 1, 1, 8, 0, 0, 0, zoneId);
    Bundle trigger = timestampTriggerBundle(start.toInstant().toEpochMilli(), 1);
    trigger.putInt("repeatInterval", 2);
    TimestampTriggerModel model = TimestampTriggerModel.fromBundle(trigger);

    model.setNextTimestamp();

    ZonedDateTime next = Instant.ofEpochMilli(model.getTimestamp()).atZone(zoneId);
    // The start is in the past; with a 2-day interval the next fire lands on an
    // odd day-of-month (1st + 2n days) after the current time.
    assertEquals(1, next.getDayOfMonth() % 2);
  }

  @Test
  public void toBundle_persistsAdvancedTimestamp() {
    long start = System.currentTimeMillis() - 60_000;
    Bundle trigger = timestampTriggerBundle(start, 1); // daily, in the past
    TimestampTriggerModel model = TimestampTriggerModel.fromBundle(trigger);

    model.setNextTimestamp();

    Bundle persisted = model.toBundle();
    assertEquals(model.getTimestamp(), persisted.getLong("timestamp"));
  }
}
