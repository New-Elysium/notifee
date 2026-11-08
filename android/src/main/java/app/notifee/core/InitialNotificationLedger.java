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

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.Nullable;
import androidx.annotation.VisibleForTesting;

/**
 * Durable record of the notification taps returned by {@link Notifee#getInitialNotification}, so
 * each tap is returned at most once, including when its Activity is recreated in a new process.
 *
 * <p>Taps of {@link NotificationPendingIntent} launch flows are numbered by {@link
 * NotificationReceiverHandler}. The number travels with the sticky {@code InitialNotificationEvent}
 * and is stored with the id of the tapped PendingIntent; like the sticky event, only the latest tap
 * is kept. The sticky event and the launch Intent of a tap claim the same number, so the tap is
 * returned by whichever is read first. A launch Intent can only claim the latest tap of its own
 * PendingIntent, which it gets once the sticky event has been lost with the process that received
 * it.
 *
 * <p>Claims are committed before the interaction is returned.
 */
final class InitialNotificationLedger {
  private static final String TAG = "InitialNotificationLedger";
  private static final String PREFERENCES_FILE = "app.notifee.core.initial_notification";
  private static final String LAST_TAP_SEQUENCE_KEY = "last_tap_sequence";
  private static final String LAST_TAP_PENDING_INTENT_ID_KEY = "last_tap_pending_intent_id";
  private static final String CLAIMED_TAP_SEQUENCE_KEY = "claimed_tap_sequence";

  private static final Object lock = new Object();

  private InitialNotificationLedger() {}

  /**
   * Records a tap before its sticky event is posted.
   *
   * @return the tap's sequence number, or 0 if it was not recorded (the tap is then returned by its
   *     sticky event only).
   */
  static long recordTap(@Nullable String pendingIntentId) {
    synchronized (lock) {
      try {
        SharedPreferences preferences = getPreferences();
        long sequence = preferences.getLong(LAST_TAP_SEQUENCE_KEY, 0) + 1;
        // Main thread, so not committed: a record lost with the process only means the tap cannot
        // be recovered from its launch Intent; it is never returned twice.
        preferences
            .edit()
            .putLong(LAST_TAP_SEQUENCE_KEY, sequence)
            .putString(LAST_TAP_PENDING_INTENT_ID_KEY, pendingIntentId)
            .apply();
        return sequence;
      } catch (Exception e) {
        Logger.e(TAG, "Failed to record notification tap", e);
        return 0;
      }
    }
  }

  enum TapClaim {
    CLAIMED,
    ALREADY_CLAIMED,
    RETRY
  }

  /** Claims a sticky tap durably, or leaves it pending when storage is unavailable. */
  static TapClaim claimTap(long tapSequence) {
    if (tapSequence <= 0) {
      return TapClaim.CLAIMED;
    }

    synchronized (lock) {
      try {
        SharedPreferences preferences = getPreferences();
        long claimed = preferences.getLong(CLAIMED_TAP_SEQUENCE_KEY, 0);
        if (tapSequence <= claimed) {
          return TapClaim.ALREADY_CLAIMED;
        }
        if (preferences.edit().putLong(CLAIMED_TAP_SEQUENCE_KEY, tapSequence).commit()) {
          return TapClaim.CLAIMED;
        }
        // A failed edit still advances the in-memory value. Keep the interaction retryable,
        // without returning a tap that a later process could return again.
        preferences.edit().putLong(CLAIMED_TAP_SEQUENCE_KEY, claimed).apply();
        Logger.w(TAG, "Failed to persist notification tap claim");
      } catch (Exception e) {
        Logger.e(TAG, "Failed to claim notification tap", e);
      }
      return TapClaim.RETRY;
    }
  }

  /** Claims the latest tap for a launch Intent of {@code pendingIntentId}, if not returned yet. */
  static boolean claimLatestTap(String pendingIntentId) {
    synchronized (lock) {
      try {
        SharedPreferences preferences = getPreferences();
        long latest = preferences.getLong(LAST_TAP_SEQUENCE_KEY, 0);
        if (latest <= preferences.getLong(CLAIMED_TAP_SEQUENCE_KEY, 0)
            || !pendingIntentId.equals(
                preferences.getString(LAST_TAP_PENDING_INTENT_ID_KEY, null))) {
          return false;
        }
        return claimTap(latest) == TapClaim.CLAIMED;
      } catch (Exception e) {
        Logger.e(TAG, "Failed to claim notification tap", e);
        return false;
      }
    }
  }

  @VisibleForTesting
  static void clearForTesting() {
    synchronized (lock) {
      if (!getPreferences().edit().clear().commit()) {
        Logger.w(TAG, "Failed to clear initial notification ledger");
      }
    }
  }

  private static SharedPreferences getPreferences() {
    return ContextHolder.getApplicationContext()
        .getSharedPreferences(PREFERENCES_FILE, Context.MODE_PRIVATE);
  }
}
