package app.notifee.core.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import android.graphics.Color;
import android.os.Bundle;
import java.util.ArrayList;
import org.junit.Test;

public class NotificationAndroidModelTest {
  @Test
  public void shortCriticalTextAndPromotedOngoing_parseAsExpected() {
    Bundle bundle = new Bundle();
    bundle.putString("shortCriticalText", "");
    bundle.putBoolean("promotedOngoing", true);

    NotificationAndroidModel model = NotificationAndroidModel.fromBundle(bundle);

    assertEquals("", model.getShortCriticalText());
    assertEquals(true, model.getPromotedOngoing());
  }

  @Test
  public void segmentedProgress_parsesSegmentsPointsNullableStyledByProgressAndTrackerIcon() {
    Bundle firstSegment = new Bundle();
    firstSegment.putInt("length", 5);
    firstSegment.putString("color", "#ff0000");
    Bundle secondSegment = new Bundle();
    secondSegment.putInt("length", 7);
    secondSegment.putString("color", "#00ff00");
    ArrayList<Bundle> segments = new ArrayList<>();
    segments.add(firstSegment);
    segments.add(secondSegment);

    Bundle firstPoint = new Bundle();
    firstPoint.putInt("position", 3);
    firstPoint.putString("color", "#0000ff");
    ArrayList<Bundle> points = new ArrayList<>();
    points.add(firstPoint);

    Bundle progress = new Bundle();
    progress.putInt("current", 4);
    progress.putBoolean("indeterminate", false);
    progress.putString("trackerIcon", "ic_tracker");
    putRawParcelableArrayList(progress, "segments", segments);
    putRawParcelableArrayList(progress, "points", points);

    Bundle bundle = new Bundle();
    bundle.putBundle("progress", progress);

    NotificationAndroidModel.AndroidProgress parsedProgress =
        NotificationAndroidModel.fromBundle(bundle).getProgress();

    assertNotNull(parsedProgress);
    assertEquals(4, parsedProgress.getCurrent());
    assertFalse(parsedProgress.getIndeterminate());
    assertNull(parsedProgress.getStyledByProgress());
    assertEquals("ic_tracker", parsedProgress.getTrackerIcon());
    assertNotNull(parsedProgress.getSegments());
    assertEquals(2, parsedProgress.getSegments().size());
    assertEquals(5, parsedProgress.getSegments().get(0).getLength());
    assertEquals(Color.parseColor("#ff0000"), parsedProgress.getSegments().get(0).getColor());
    assertNotNull(parsedProgress.getPoints());
    assertEquals(1, parsedProgress.getPoints().size());
    assertEquals(3, parsedProgress.getPoints().get(0).getPosition());
    assertEquals(Color.parseColor("#0000ff"), parsedProgress.getPoints().get(0).getColor());
  }

  @Test
  public void segmentedProgress_preservesEmptyPointsAndExplicitStyledByProgress() {
    Bundle segment = new Bundle();
    segment.putInt("length", 10);
    segment.putString("color", "#123456");
    ArrayList<Bundle> segments = new ArrayList<>();
    segments.add(segment);

    Bundle progress = new Bundle();
    progress.putInt("current", 2);
    progress.putBoolean("styledByProgress", false);
    putRawParcelableArrayList(progress, "segments", segments);
    putRawParcelableArrayList(progress, "points", new ArrayList<Bundle>());

    Bundle bundle = new Bundle();
    bundle.putBundle("progress", progress);

    NotificationAndroidModel.AndroidProgress parsedProgress =
        NotificationAndroidModel.fromBundle(bundle).getProgress();

    assertNotNull(parsedProgress);
    assertEquals(false, parsedProgress.getStyledByProgress());
    assertNotNull(parsedProgress.getPoints());
    assertEquals(0, parsedProgress.getPoints().size());
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static void putRawParcelableArrayList(Bundle bundle, String key, ArrayList<?> arrayList) {
    bundle.putParcelableArrayList(key, (ArrayList) arrayList);
  }
}
