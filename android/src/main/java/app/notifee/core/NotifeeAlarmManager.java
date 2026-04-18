package app.notifee.core;

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

import static app.notifee.core.ContextHolder.getApplicationContext;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.AlarmManagerCompat;
import app.notifee.core.database.WorkDataEntity;
import app.notifee.core.database.WorkDataRepository;
import app.notifee.core.model.NotificationModel;
import app.notifee.core.model.TimestampTriggerModel;
import app.notifee.core.utility.AlarmUtils;
import app.notifee.core.utility.ExtendedListenableFuture;
import app.notifee.core.utility.ObjectUtils;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

class NotifeeAlarmManager {
  private static final String TAG = "NotifeeAlarmManager";
  private static final String NOTIFICATION_ID_INTENT_KEY = "notificationId";
  private static final long RECEIVER_WRITE_TIMEOUT_SECONDS = 8;
  private static final ExecutorService alarmManagerExecutor = Executors.newCachedThreadPool();
  private static final ScheduledExecutorService timeoutExecutor =
      Executors.newSingleThreadScheduledExecutor();
  private static final ListeningExecutorService alarmManagerListeningExecutor =
      MoreExecutors.listeningDecorator(alarmManagerExecutor);

  private static void finishReceiverWhenDone(
      ListenableFuture<?> future,
      BroadcastReceiver.PendingResult pendingResult,
      String logContext) {
    ListenableFuture<?> bounded =
        Futures.withTimeout(
            future, RECEIVER_WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS, timeoutExecutor);
    Futures.addCallback(
        bounded,
        new FutureCallback<Object>() {
          @Override
          public void onSuccess(Object result) {
            if (pendingResult != null) {
              pendingResult.finish();
            }
          }

          @Override
          public void onFailure(Throwable t) {
            if (t instanceof TimeoutException) {
              Logger.w(
                  TAG,
                  "Async work for "
                      + logContext
                      + " did not complete within "
                      + RECEIVER_WRITE_TIMEOUT_SECONDS
                      + "s; finishing receiver anyway to avoid ANR");
            } else {
              Logger.e(TAG, "Failure in " + logContext, new Exception(t));
            }
            if (pendingResult != null) {
              pendingResult.finish();
            }
          }
        },
        alarmManagerListeningExecutor);
  }

  static void displayScheduledNotification(
      Bundle alarmManagerNotification, BroadcastReceiver.PendingResult pendingResult) {
    if (alarmManagerNotification == null) {
      if (pendingResult != null) {
        pendingResult.finish();
      }
      return;
    }
    String id = alarmManagerNotification.getString(NOTIFICATION_ID_INTENT_KEY);

    if (id == null) {
      if (pendingResult != null) {
        pendingResult.finish();
      }
      return;
    }

    WorkDataRepository workDataRepository = new WorkDataRepository(getApplicationContext());

    ListenableFuture<?> displayFuture =
        new ExtendedListenableFuture<>(workDataRepository.getWorkDataById(id))
            .continueWith(
                workDataEntity -> {
                  Bundle notificationBundle;

                  Bundle triggerBundle;

                  if (workDataEntity == null
                      || workDataEntity.getNotification() == null
                      || workDataEntity.getTrigger() == null) {
                    // check if notification bundle is stored with Work Manager
                    Logger.w(
                        TAG,
                        "Attempted to handle doScheduledWork but no notification data was found.");
                    return Futures.immediateFuture(null);
                  } else {
                    triggerBundle = ObjectUtils.bytesToBundle(workDataEntity.getTrigger());
                    notificationBundle =
                        ObjectUtils.bytesToBundle(workDataEntity.getNotification());
                  }

                  NotificationModel notificationModel =
                      NotificationModel.fromBundle(notificationBundle);

                  return new ExtendedListenableFuture<>(
                          NotificationManager.displayNotification(notificationModel, triggerBundle))
                      .continueWith(
                          voidDisplayedNotification -> {
                            if (triggerBundle.containsKey("repeatFrequency")
                                && ObjectUtils.getInt(triggerBundle.get("repeatFrequency")) != -1) {
                              TimestampTriggerModel trigger =
                                  TimestampTriggerModel.fromBundle(triggerBundle);
                              scheduleTimestampTriggerNotification(notificationModel, trigger);
                              return WorkDataRepository.getInstance(getApplicationContext())
                                  .update(
                                      new WorkDataEntity(
                                          id,
                                          workDataEntity.getNotification(),
                                          ObjectUtils.bundleToBytes(trigger.toBundle()),
                                          true));
                            } else {
                              return WorkDataRepository.getInstance(getApplicationContext())
                                  .deleteById(id);
                            }
                          },
                          alarmManagerExecutor);
                },
                alarmManagerExecutor)
            .addOnCompleteListener((e, result) -> {}, alarmManagerExecutor);
    finishReceiverWhenDone(displayFuture, pendingResult, "displayScheduledNotification[" + id + "]");
  }

  public static PendingIntent getAlarmManagerIntentForNotification(String notificationId) {
    try {
      Context context = getApplicationContext();
      Intent notificationIntent = new Intent(context, NotificationAlarmReceiver.class);
      notificationIntent.putExtra(NOTIFICATION_ID_INTENT_KEY, notificationId);
      return PendingIntent.getBroadcast(
          context,
          notificationId.hashCode(),
          notificationIntent,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

    } catch (Exception e) {
      Logger.e(TAG, "Unable to create AlarmManager intent", e);
    }

    return null;
  }

  static void scheduleTimestampTriggerNotification(
      NotificationModel notificationModel, TimestampTriggerModel timestampTrigger) {

    PendingIntent pendingIntent = getAlarmManagerIntentForNotification(notificationModel.getId());

    AlarmManager alarmManager = AlarmUtils.getAlarmManager();

    TimestampTriggerModel.AlarmType alarmType = timestampTrigger.getAlarmType();

    // Verify we can call setExact APIs to avoid a crash, but it requires an Android S+ symbol
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {

      // Check whether the alarmType is the exact alarm
      boolean isExactAlarm =
          Arrays.asList(
                  TimestampTriggerModel.AlarmType.SET_EXACT,
                  TimestampTriggerModel.AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
                  TimestampTriggerModel.AlarmType.SET_ALARM_CLOCK)
              .contains(alarmType);
      if (isExactAlarm && !alarmManager.canScheduleExactAlarms()) {
        Logger.w(
            TAG,
            "Missing SCHEDULE_EXACT_ALARM permission; falling back to inexact alarm scheduling.");
        if (alarmType == TimestampTriggerModel.AlarmType.SET_EXACT) {
          alarmType = TimestampTriggerModel.AlarmType.SET_AND_ALLOW_WHILE_IDLE;
        } else if (alarmType == TimestampTriggerModel.AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE
            || alarmType == TimestampTriggerModel.AlarmType.SET_ALARM_CLOCK) {
          alarmType = TimestampTriggerModel.AlarmType.SET_AND_ALLOW_WHILE_IDLE;
        }
      }
    }

    // Ensure timestamp is always in the future when scheduling the alarm
    timestampTrigger.setNextTimestamp();

    switch (alarmType) {
      case SET:
        alarmManager.set(AlarmManager.RTC_WAKEUP, timestampTrigger.getTimestamp(), pendingIntent);
        break;
      case SET_AND_ALLOW_WHILE_IDLE:
        AlarmManagerCompat.setAndAllowWhileIdle(
            alarmManager, AlarmManager.RTC_WAKEUP, timestampTrigger.getTimestamp(), pendingIntent);
        break;
      case SET_EXACT:
        AlarmManagerCompat.setExact(
            alarmManager, AlarmManager.RTC_WAKEUP, timestampTrigger.getTimestamp(), pendingIntent);
        break;
      case SET_EXACT_AND_ALLOW_WHILE_IDLE:
        AlarmManagerCompat.setExactAndAllowWhileIdle(
            alarmManager, AlarmManager.RTC_WAKEUP, timestampTrigger.getTimestamp(), pendingIntent);
        break;
      case SET_ALARM_CLOCK:
        // probably a good default behavior for setAlarmClock's

        int mutabilityFlag = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
          mutabilityFlag = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
        }

        Context context = getApplicationContext();
        Intent launchActivityIntent =
            context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());

        PendingIntent pendingLaunchIntent =
            PendingIntent.getActivity(
                context,
                notificationModel.getId().hashCode(),
                launchActivityIntent,
                mutabilityFlag);
        AlarmManagerCompat.setAlarmClock(
            alarmManager, timestampTrigger.getTimestamp(), pendingLaunchIntent, pendingIntent);
        break;
    }
  }

  ListenableFuture<List<WorkDataEntity>> getScheduledNotifications() {
    WorkDataRepository workDataRepository = new WorkDataRepository(getApplicationContext());
    return workDataRepository.getAllWithAlarmManager(true);
  }

  public static void cancelNotification(String notificationId) {
    PendingIntent pendingIntent = getAlarmManagerIntentForNotification(notificationId);
    AlarmManager alarmManager = AlarmUtils.getAlarmManager();
    if (pendingIntent != null) {
      alarmManager.cancel(pendingIntent);
    }
  }

  public static ListenableFuture<Void> cancelAllNotifications() {
    WorkDataRepository workDataRepository = WorkDataRepository.getInstance(getApplicationContext());

    return new ExtendedListenableFuture<>(workDataRepository.getAllWithAlarmManager(true))
        .continueWith(
            workDataEntities -> {
              if (workDataEntities != null) {
                for (WorkDataEntity workDataEntity : workDataEntities) {
                  NotifeeAlarmManager.cancelNotification(workDataEntity.getId());
                }
              }
              return Futures.immediateFuture(null);
            },
            alarmManagerListeningExecutor);
  }

  /* On reboot, reschedule trigger notifications created via alarm manager  */
  ListenableFuture<Void> rescheduleNotification(WorkDataEntity workDataEntity) {
    if (workDataEntity.getNotification() == null || workDataEntity.getTrigger() == null) {
      return Futures.immediateFuture(null);
    }

    byte[] notificationBytes = workDataEntity.getNotification();
    byte[] triggerBytes = workDataEntity.getTrigger();
    Bundle triggerBundle = ObjectUtils.bytesToBundle(triggerBytes);

    NotificationModel notificationModel =
        NotificationModel.fromBundle(ObjectUtils.bytesToBundle(notificationBytes));

    int triggerType = ObjectUtils.getInt(triggerBundle.get("type"));

    switch (triggerType) {
      case 0:
        TimestampTriggerModel trigger = TimestampTriggerModel.fromBundle(triggerBundle);
        if (!trigger.getWithAlarmManager()) {
          return Futures.immediateFuture(null);
        }

        scheduleTimestampTriggerNotification(notificationModel, trigger);
        return Futures.immediateFuture(null);
      case 1:
        // TODO: support interval triggers with alarm manager
        return Futures.immediateFuture(null);
    }
    return Futures.immediateFuture(null);
  }

  void rescheduleNotifications(BroadcastReceiver.PendingResult pendingResult) {
    Logger.d(TAG, "Reschedule Notifications on reboot");
    Futures.addCallback(
        getScheduledNotifications(),
        new FutureCallback<List<WorkDataEntity>>() {
          @Override
          public void onSuccess(List<WorkDataEntity> workDataEntities) {
            if (workDataEntities == null || workDataEntities.isEmpty()) {
              if (pendingResult != null) {
                pendingResult.finish();
              }
              return;
            }
            List<ListenableFuture<Void>> futures = new java.util.ArrayList<>(workDataEntities.size());
            for (WorkDataEntity workDataEntity : workDataEntities) {
              futures.add(rescheduleNotification(workDataEntity));
            }
            finishReceiverWhenDone(
                Futures.allAsList(futures), pendingResult, "rescheduleNotifications");
          }

          @Override
          public void onFailure(Throwable t) {
            Logger.e(TAG, "Failed to reschedule notifications", new Exception(t));
            if (pendingResult != null) {
              pendingResult.finish();
            }
          }
        },
        alarmManagerListeningExecutor);
  }
}
