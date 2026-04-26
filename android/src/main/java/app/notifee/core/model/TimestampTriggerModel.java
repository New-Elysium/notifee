package app.notifee.core.model;

/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import android.os.Bundle;
import androidx.annotation.NonNull;
import app.notifee.core.utility.ObjectUtils;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;

public class TimestampTriggerModel {
  private Bundle mTimeTriggerBundle;
  private int mInterval = -1;
  private TimeUnit mTimeUnit = null;
  private Boolean mWithAlarmManager = false;
  private AlarmType mAlarmType = AlarmType.SET_EXACT;
  private String mRepeatFrequency = null;
  private Long mTimestamp = null;

  public static final String HOURLY = "HOURLY";
  public static final String DAILY = "DAILY";
  public static final String WEEKLY = "WEEKLY";

  private static final int MINUTES_IN_MS = 60 * 1000;
  private static final long HOUR_IN_MS = 60 * MINUTES_IN_MS;
  private static final long DAY_IN_MS = 24 * HOUR_IN_MS;

  private static final String TAG = "TimeTriggerModel";

  private TimestampTriggerModel(Bundle bundle) {
    mTimeTriggerBundle = bundle;

    // set initial values
    TimeUnit timeUnit = null;
    if (mTimeTriggerBundle.containsKey("repeatFrequency")) {
      int repeatFrequency = ObjectUtils.getInt(mTimeTriggerBundle.get("repeatFrequency"));
      mTimestamp = ObjectUtils.getLong(mTimeTriggerBundle.get("timestamp"));

      switch (repeatFrequency) {
        case -1:
          // default value for one-time trigger
          break;
        case 0:
          mInterval = 1;
          mTimeUnit = TimeUnit.HOURS;
          mRepeatFrequency = HOURLY;
          break;
        case 1:
          mInterval = 1;
          mTimeUnit = TimeUnit.DAYS;
          mRepeatFrequency = DAILY;
          break;
        case 2:
          // weekly, 7 days
          mInterval = 7;
          mTimeUnit = TimeUnit.DAYS;
          mRepeatFrequency = WEEKLY;
          break;
      }
    }

    if (mTimeTriggerBundle.containsKey("alarmManager")) {
      mWithAlarmManager = true;

      Bundle alarmManagerBundle = mTimeTriggerBundle.getBundle("alarmManager");

      Object typeObj = alarmManagerBundle.get("type");

      int type;
      if (typeObj != null) {
        type = ObjectUtils.getInt(typeObj);
      } else {
        type = 2;
      }

      // this is for the deprecated `alarmManager.allowWhileIdle` option
      if (alarmManagerBundle.containsKey("allowWhileIdle")
          && alarmManagerBundle.getBoolean("allowWhileIdle")) {
        type = 3;
      }

      switch (type) {
        case 0:
          mAlarmType = AlarmType.SET;
          break;
        case 1:
          mAlarmType = AlarmType.SET_AND_ALLOW_WHILE_IDLE;
          break;
        // default behavior when alarmManager is true:
        default:
        case 2:
          mAlarmType = AlarmType.SET_EXACT;
          break;
        case 3:
          mAlarmType = AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE;
          break;
        case 4:
          mAlarmType = AlarmType.SET_ALARM_CLOCK;
          break;
      }
    } else if (mTimeTriggerBundle.containsKey("allowWhileIdle")) {
      // for dart
      mWithAlarmManager = true;
      mAlarmType = AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE;
    }
  }

  public static TimestampTriggerModel fromBundle(@NonNull Bundle bundle) {
    return new TimestampTriggerModel(bundle);
  }

  public long getTimestamp() {
    return mTimestamp;
  }

  public long getDelay() {
    long delay = 0;

    if (mTimeTriggerBundle.containsKey("timestamp")) {
      long timestamp = ObjectUtils.getLong(mTimeTriggerBundle.get("timestamp"));
      if (timestamp > 0) {
        delay = Math.round((timestamp - System.currentTimeMillis()) / 1000);
      }
    }

    return delay;
  }

  public void setNextTimestamp() {
    // Skip for non-repeating triggers
    if (mRepeatFrequency == null) {
      return;
    }

    long timestamp = getTimestamp();

    // For HOURLY, fixed millisecond interval is correct (not affected by DST)
    if (mRepeatFrequency == TimestampTriggerModel.HOURLY) {
      long interval = HOUR_IN_MS;
      while (timestamp < System.currentTimeMillis()) {
        timestamp += interval;
      }
      this.mTimestamp = timestamp;
      return;
    }

    // For DAILY and WEEKLY, use java.time to preserve wall-clock time across DST boundaries (#875)
    ZoneId zoneId = ZoneId.systemDefault();
    ZonedDateTime scheduledTime = Instant.ofEpochMilli(timestamp).atZone(zoneId);
    ZonedDateTime now = ZonedDateTime.now(zoneId);

    switch (mRepeatFrequency) {
      case TimestampTriggerModel.DAILY:
        // Advance day-by-day preserving the original local time until we're in the future
        while (!scheduledTime.isAfter(now)) {
          scheduledTime = scheduledTime.plusDays(1);
        }
        break;
      case TimestampTriggerModel.WEEKLY:
        // Advance week-by-week preserving the original local time until we're in the future
        while (!scheduledTime.isAfter(now)) {
          scheduledTime = scheduledTime.plusWeeks(1);
        }
        break;
    }

    this.mTimestamp = scheduledTime.toInstant().toEpochMilli();
  }

  public enum AlarmType {
    SET,
    SET_AND_ALLOW_WHILE_IDLE,
    SET_EXACT,
    SET_EXACT_AND_ALLOW_WHILE_IDLE,
    SET_ALARM_CLOCK,
  }

  public int getInterval() {
    return mInterval;
  }

  public TimeUnit getTimeUnit() {
    return mTimeUnit;
  }

  public Boolean getWithAlarmManager() {
    return mWithAlarmManager;
  }

  public AlarmType getAlarmType() {
    return mAlarmType;
  }

  public String getRepeatFrequency() {
    return mRepeatFrequency;
  }

  public Bundle toBundle() {
    return (Bundle) mTimeTriggerBundle.clone();
  }
}
