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

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationManagerCompat;
import app.notifee.core.event.ForegroundServiceEvent;
import app.notifee.core.event.NotificationEvent;
import app.notifee.core.interfaces.MethodCallResult;
import app.notifee.core.model.NotificationModel;

public class ForegroundService extends Service {
  private static final String TAG = "ForegroundService";
  public static final String START_FOREGROUND_SERVICE_ACTION =
      "app.notifee.core.ForegroundService.START";
  public static final String STOP_FOREGROUND_SERVICE_ACTION =
      "app.notifee.core.ForegroundService.STOP";

  public static String mCurrentNotificationId = null;

  public static int mCurrentForegroundServiceType = -1;

  @Nullable private static Bundle mCurrentNotificationBundle = null;

  static void start(int hashCode, Notification notification, Bundle notificationBundle) {
    Intent intent = new Intent(ContextHolder.getApplicationContext(), ForegroundService.class);
    intent.setAction(START_FOREGROUND_SERVICE_ACTION);
    intent.putExtra("hashCode", hashCode);
    intent.putExtra("notification", notification);
    intent.putExtra("notificationBundle", notificationBundle);

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextHolder.getApplicationContext().startForegroundService(intent);
      } else {
        ContextHolder.getApplicationContext().startService(intent);
      }
    } catch (IllegalStateException e) {
      // On Android 12+ (API 31+), this may be a ForegroundServiceStartNotAllowedException
      // indicating the app cannot start a foreground service from the background (#470).
      // On earlier versions, this is a general IllegalStateException for the same condition.
      // Log an actionable message instead of crashing.
      String message = "Cannot start foreground service: app may be in background state.";
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        message =
            "Cannot start foreground service: background start not allowed on Android 12+. See"
                + " https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start";
      }
      Logger.e(TAG, message, e);
    }
  }

  static void stop() {
    Intent intent = new Intent(ContextHolder.getApplicationContext(), ForegroundService.class);
    intent.setAction(STOP_FOREGROUND_SERVICE_ACTION);

    try {
      // Call start service first with stop action
      ContextHolder.getApplicationContext().startService(intent);
    } catch (IllegalStateException illegalStateException) {
      // try to stop with stopService command
      ContextHolder.getApplicationContext().stopService(intent);
    } catch (Exception exception) {
      Logger.e(TAG, "Unable to stop foreground service", exception);
    }
  }

  @SuppressLint({"ForegroundServiceType", "MissingPermission"})
  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    // Check if action is to stop the foreground service
    if (intent == null || STOP_FOREGROUND_SERVICE_ACTION.equals(intent.getAction())) {
      stopSelf();
      mCurrentNotificationId = null;
      mCurrentForegroundServiceType = -1;
      mCurrentNotificationBundle = null;
      return Service.START_STICKY_COMPATIBILITY;
    }

    Bundle extras = intent.getExtras();

    if (extras != null) {
      // Hash code is sent to service to ensure it is kept the same
      int hashCode = extras.getInt("hashCode");
      Notification notification = extras.getParcelable("notification");
      Bundle bundle = extras.getBundle("notificationBundle");

      if (notification != null & bundle != null) {
        NotificationModel notificationModel = NotificationModel.fromBundle(bundle);

        if (mCurrentNotificationId == null) {
          mCurrentNotificationId = notificationModel.getId();
          mCurrentNotificationBundle = bundle;

          boolean foregroundStarted;
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int foregroundServiceType = notificationModel.getAndroid().getForegroundServiceType();
            foregroundStarted =
                tryStartForeground(startId, hashCode, notification, foregroundServiceType);
            if (foregroundStarted) {
              mCurrentForegroundServiceType = foregroundServiceType;
            }
          } else {
            foregroundStarted = tryStartForeground(startId, hashCode, notification);
          }

          if (!foregroundStarted) {
            mCurrentNotificationId = null;
            mCurrentForegroundServiceType = -1;
            mCurrentNotificationBundle = null;
            return START_NOT_STICKY;
          }

          // On headless task complete
          final MethodCallResult<Void> methodCallResult =
              (e, aVoid) -> {
                stopForeground(true);
                mCurrentNotificationId = null;
                mCurrentForegroundServiceType = -1;
                mCurrentNotificationBundle = null;
              };

          ForegroundServiceEvent foregroundServiceEvent =
              new ForegroundServiceEvent(notificationModel, methodCallResult);

          EventBus.post(foregroundServiceEvent);
        } else {
          if (mCurrentNotificationId.equals(notificationModel.getId())) {
            boolean shouldPostNotificationAgain = true;
            // find if we need to start the service again if the type was changed
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              int foregroundServiceType = notificationModel.getAndroid().getForegroundServiceType();
              if (foregroundServiceType != mCurrentForegroundServiceType) {
                if (tryStartForeground(startId, hashCode, notification, foregroundServiceType)) {
                  mCurrentForegroundServiceType = foregroundServiceType;
                  mCurrentNotificationBundle = bundle;
                  shouldPostNotificationAgain = false;
                }
              }
            }
            if (shouldPostNotificationAgain) {
              NotificationManagerCompat.from(ContextHolder.getApplicationContext())
                  .notify(hashCode, notification);
            }
          } else {
            EventBus.post(
                new NotificationEvent(NotificationEvent.TYPE_FG_ALREADY_EXIST, notificationModel));
          }
        }
      }
    }

    return START_NOT_STICKY;
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @androidx.annotation.RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
  @Override
  public void onTimeout(int startId) {
    handleTimeout(startId, -1);
  }

  @androidx.annotation.RequiresApi(Build.VERSION_CODES.VANILLA_ICE_CREAM)
  @Override
  public void onTimeout(int startId, int fgsType) {
    handleTimeout(startId, fgsType);
  }

  /**
   * Stops the service when Android reports that it exceeded its run limit and notifies JS so the
   * app can stop long-running work instead of being frozen or killed silently.
   */
  private void handleTimeout(int startId, int fgsType) {
    Logger.e(TAG, "Foreground service timed out on Android 14+, stopping service to avoid ANR.");

    Bundle notificationBundle = mCurrentNotificationBundle;

    stopForeground(true);
    stopSelf(startId);
    mCurrentNotificationId = null;
    mCurrentForegroundServiceType = -1;
    mCurrentNotificationBundle = null;

    if (notificationBundle == null) {
      return;
    }

    try {
      NotificationModel notificationModel = NotificationModel.fromBundle(notificationBundle);
      Bundle extras = new Bundle();
      extras.putInt("startId", startId);
      extras.putInt("fgsType", fgsType);
      EventBus.post(
          new NotificationEvent(NotificationEvent.TYPE_FG_TIMEOUT, notificationModel, extras));
    } catch (Exception e) {
      Logger.e(TAG, "Failed to publish foreground service timeout event", e);
    }
  }

  /**
   * Calls {@link #startForeground(int, Notification)} and stops this service if Android denies the
   * foreground promotion (for example a background start restriction or a missing foreground
   * service type permission), instead of crashing the app.
   */
  @SuppressLint({"ForegroundServiceType", "MissingPermission"})
  private boolean tryStartForeground(int startId, int hashCode, Notification notification) {
    try {
      startForeground(hashCode, notification);
      return true;
    } catch (Exception e) {
      logStartForegroundFailure(e);
      stopSelf(startId);
      return false;
    }
  }

  /**
   * Calls {@link #startForeground(int, Notification, int)} and stops this service if Android denies
   * the foreground promotion (for example a background start restriction or an invalid/missing
   * foreground service type), instead of crashing the app.
   */
  @SuppressLint({"ForegroundServiceType", "MissingPermission"})
  private boolean tryStartForeground(
      int startId, int hashCode, Notification notification, int foregroundServiceType) {
    try {
      startForeground(hashCode, notification, foregroundServiceType);
      return true;
    } catch (Exception e) {
      logStartForegroundFailure(e);
      stopSelf(startId);
      return false;
    }
  }

  private void logStartForegroundFailure(Exception exception) {
    String message =
        "Unable to promote service to foreground; Android denied startForeground()."
            + " Stopping the service to avoid an ANR.";
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      message +=
          " See https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start";
    }
    Logger.e(TAG, message, exception);
  }
}
