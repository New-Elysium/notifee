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

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.ProviderInfo;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Settings;
import androidx.annotation.CallSuper;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.VisibleForTesting;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@KeepForSdk
public class InitProvider extends ContentProvider {
  private static final String PROVIDER_AUTHORITY = "notifee-init-provider";
  private static final String TAG = "InitProvider";

  @Override
  public void attachInfo(Context context, ProviderInfo info) {
    if (info != null && !info.authority.endsWith(InitProvider.PROVIDER_AUTHORITY)) {
      throw new IllegalStateException(
          "Incorrect provider authority in manifest. This is most likely due to a missing "
              + "applicationId variable in application's build.gradle.");
    }

    super.attachInfo(context, info);
  }

  @CallSuper
  @Override
  public boolean onCreate() {
    if (ContextHolder.getApplicationContext() == null) {
      Context context = getContext();
      if (context != null && context.getApplicationContext() != null) {
        context = context.getApplicationContext();
      }
      ContextHolder.setApplicationContext(context);
    }

    Context appContext = ContextHolder.getApplicationContext();
    if (appContext != null) {
      dispatchBootCheck(appContext);
    }

    return false;
  }

  private static void dispatchBootCheck(final Context context) {
    ExecutorService executor =
        Executors.newSingleThreadExecutor(
            r -> {
              Thread t = new Thread(r, "notifee-boot-check");
              t.setDaemon(true);
              t.setPriority(Thread.MIN_PRIORITY);
              return t;
            });

    executor.submit(() -> runBootCheck(context));
    executor.shutdown();
  }

  static void runBootCheck(Context context) {
    try {
      int currentBootCount = readBootCount(context);
      int lastKnownBootCount =
          Preferences.getSharedInstance().getIntValue(Preferences.LAST_KNOWN_BOOT_COUNT_KEY, -1);

      boolean shouldReschedule = shouldRescheduleAfterBoot(currentBootCount, lastKnownBootCount);

      if (currentBootCount != -1) {
        Preferences.getSharedInstance()
            .setIntValue(Preferences.LAST_KNOWN_BOOT_COUNT_KEY, currentBootCount);
      }

      if (shouldReschedule) {
        Logger.i(TAG, "BOOT_COUNT change detected (or unavailable); running cold-start reschedule");
        new NotifeeAlarmManager().rescheduleNotifications(null);
      }
    } catch (Throwable t) {
      Logger.e(TAG, "Cold-start reschedule check failed", t);
    }
  }

  private static int readBootCount(Context context) {
    try {
      return Settings.Global.getInt(context.getContentResolver(), Settings.Global.BOOT_COUNT, -1);
    } catch (Throwable t) {
      Logger.w(TAG, "Failed to read Settings.Global.BOOT_COUNT", t);
      return -1;
    }
  }

  @VisibleForTesting
  static boolean shouldRescheduleAfterBoot(int currentBootCount, int lastKnownBootCount) {
    if (currentBootCount == -1) {
      return true;
    }
    if (lastKnownBootCount == -1) {
      return false;
    }
    return currentBootCount != lastKnownBootCount;
  }

  @Nullable
  @Override
  public Cursor query(
      @NonNull Uri uri,
      String[] projection,
      String selection,
      String[] selectionArgs,
      String sortOrder) {
    return null;
  }

  @Nullable
  @Override
  public String getType(@NonNull Uri uri) {
    return null;
  }

  @Nullable
  @Override
  public Uri insert(@NonNull Uri uri, ContentValues values) {
    return null;
  }

  @Override
  public int delete(@NonNull Uri uri, String selection, String[] selectionArgs) {
    return 0;
  }

  @Override
  public int update(
      @NonNull Uri uri, ContentValues values, String selection, String[] selectionArgs) {
    return 0;
  }
}
