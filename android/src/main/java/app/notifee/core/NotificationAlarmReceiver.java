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

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/*
 * This is invoked by the Alarm Manager when it is time to display a scheduled notification.
 */
public class NotificationAlarmReceiver extends BroadcastReceiver {
  private static final String TAG = "NotificationAlarmReceiver";

  @Override
  public void onReceive(Context context, Intent intent) {
    PendingResult pendingResult = goAsync();
    boolean asyncHandoffSucceeded = false;
    try {
      if (ContextHolder.getApplicationContext() == null) {
        ContextHolder.setApplicationContext(context.getApplicationContext());
      }
      NotifeeAlarmManager.displayScheduledNotification(intent.getExtras(), pendingResult);
      asyncHandoffSucceeded = true;
    } catch (Throwable t) {
      Logger.e(TAG, "Failed to display scheduled notification", t);
    } finally {
      if (!asyncHandoffSucceeded && pendingResult != null) {
        pendingResult.finish();
      }
    }
  }
}
