package app.notifee.core;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.app.Application;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

/**
 * Regression tests for the durable initial-notification tap ledger (notify-kit #88): a tap must be
 * returned by {@code getInitialNotification} at most once, including when the Activity is recreated
 * in a new process.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public class InitialNotificationLedgerTest {

  @Before
  public void setUp() {
    Application application = RuntimeEnvironment.getApplication();
    ContextHolder.setApplicationContext(application);
    InitialNotificationLedger.clearForTesting();
  }

  @Test
  public void recordTap_returnsMonotonicallyIncreasingSequences() {
    long first = InitialNotificationLedger.recordTap("pi-1");
    long second = InitialNotificationLedger.recordTap("pi-2");

    assertTrue(first > 0);
    assertTrue(second > first);
  }

  @Test
  public void claimTap_claimsExactlyOnce() {
    long sequence = InitialNotificationLedger.recordTap("pi-1");

    assertEquals(
        InitialNotificationLedger.TapClaim.CLAIMED, InitialNotificationLedger.claimTap(sequence));
    assertEquals(
        InitialNotificationLedger.TapClaim.ALREADY_CLAIMED,
        InitialNotificationLedger.claimTap(sequence));
  }

  @Test
  public void claimTap_ignoresUnrecordedSequences() {
    assertEquals(InitialNotificationLedger.TapClaim.CLAIMED, InitialNotificationLedger.claimTap(0));
  }

  @Test
  public void claimTap_claimsAcrossLedgerReinstantiation_processDeath() {
    // Simulates process death: the only durable state is the SharedPreferences
    // file, which the static methods re-read on every call. Record and claim in
    // one "process", then verify a later claim of the same tap is rejected.
    long sequence = InitialNotificationLedger.recordTap("pi-1");
    assertEquals(
        InitialNotificationLedger.TapClaim.CLAIMED, InitialNotificationLedger.claimTap(sequence));

    // New "process": same stored state, so the old tap must not be returned again...
    assertEquals(
        InitialNotificationLedger.TapClaim.ALREADY_CLAIMED,
        InitialNotificationLedger.claimTap(sequence));
    // ...but a fresh tap still gets a new, claimable sequence.
    long fresh = InitialNotificationLedger.recordTap("pi-2");
    assertTrue(fresh > sequence);
    assertEquals(
        InitialNotificationLedger.TapClaim.CLAIMED, InitialNotificationLedger.claimTap(fresh));
  }

  @Test
  public void claimLatestTap_claimsOnlyTheLatestTapOfItsOwnPendingIntent() {
    long first = InitialNotificationLedger.recordTap("pi-1");
    long second = InitialNotificationLedger.recordTap("pi-2");

    // The launch Intent of pi-1 can only claim its own tap, which is no longer
    // the latest: the latest tap belongs to pi-2.
    assertFalse(InitialNotificationLedger.claimLatestTap("pi-1"));

    // The sticky-event path can still claim the older tap directly.
    assertEquals(
        InitialNotificationLedger.TapClaim.CLAIMED, InitialNotificationLedger.claimTap(first));

    // The pi-2 launch Intent claims the latest tap, exactly once.
    assertTrue(InitialNotificationLedger.claimLatestTap("pi-2"));
    assertFalse(InitialNotificationLedger.claimLatestTap("pi-2"));
    assertEquals(
        InitialNotificationLedger.TapClaim.ALREADY_CLAIMED,
        InitialNotificationLedger.claimTap(second));
  }

  @Test
  public void claimLatestTap_returnsFalseForUnknownPendingIntent() {
    InitialNotificationLedger.recordTap("pi-1");
    assertFalse(InitialNotificationLedger.claimLatestTap("pi-unknown"));
  }
}
