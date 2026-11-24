package app.screenflow.player;

public final class DisplayRotationLayoutTest {
  static void same(double[] actual, double... expected) {
    for (int i = 0; i < expected.length; i++) if (Math.abs(actual[i] - expected[i]) > 0.001) throw new AssertionError("Invalid rotated bounds at " + i);
  }
  public static void main(String[] args) {
    same(DisplayRotationLayout.bounds(1920,1080,0,0,0,1,1),0,0,1920,1080);
    same(DisplayRotationLayout.bounds(1920,1080,90,0,0,1,1),420,-420,1080,1920);
    same(DisplayRotationLayout.bounds(1920,1080,180,0,0,1,1),0,0,1920,1080);
    same(DisplayRotationLayout.bounds(1920,1080,270,0,0,1,1),420,-420,1080,1920);
    // Logical left-half zones become top/bottom halves after clockwise rotation.
    same(DisplayRotationLayout.bounds(1920,1080,90,0,0,0.5,1),690,-690,540,1920);
    same(DisplayRotationLayout.bounds(1920,1080,270,0,0,0.5,1),690,-150,540,1920);
    same(DisplayRotationLayout.bounds(1920,1080,180,0,0,0.5,1),960,0,960,1080);
    for (int angle : new int[] {-90,45,360}) {
      try { DisplayRotationLayout.bounds(1920,1080,angle,0,0,1,1); throw new AssertionError("Unsupported rotation accepted"); }
      catch (IllegalArgumentException expected) {}
    }
    try { DisplayRotationLayout.bounds(1920,1080,90,0.8,0,0.5,1); throw new AssertionError("Out-of-screen zone accepted"); }
    catch (IllegalArgumentException expected) {}
    System.out.println("11 native display rotation checks passed");
  }
}