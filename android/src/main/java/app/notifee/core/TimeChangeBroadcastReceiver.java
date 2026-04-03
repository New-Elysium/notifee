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
import android.util.Log;

/**
 * Reschedules alarm-based trigger notifications when the device timezone or system time changes
 * (including DST transitions). Android cancels RTC-based alarms on these events, so all persisted
 * triggers must be rescheduled. (#875)
 */
public class TimeChangeBroadcastReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent.getAction();
    Log.i("TimeChangeReceiver", "Received time change event: " + action);
    if (ContextHolder.getApplicationContext() == null) {
      ContextHolder.setApplicationContext(context.getApplicationContext());
    }
    new NotifeeAlarmManager().rescheduleNotifications();
  }
}
