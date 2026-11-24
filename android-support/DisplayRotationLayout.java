package app.screenflow.player;

/** Logical viewport geometry shared by isolated native webpage sessions. */
public final class DisplayRotationLayout {
  private DisplayRotationLayout() {}
  public static boolean validRotation(int rotation) {
    return rotation == 0 || rotation == 90 || rotation == 180 || rotation == 270;
  }
  public static double[] bounds(double width, double height, int rotation, double x, double y, double w, double h) {
    if (!validRotation(rotation) || !Double.isFinite(width) || !Double.isFinite(height) || width <= 0 || height <= 0 ||
        !Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(w) || !Double.isFinite(h) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.001 || y + h > 1.001) {
      throw new IllegalArgumentException("WEBPAGE_INVALID_RECT");
    }
    boolean quarterTurn = rotation == 90 || rotation == 270;
    double logicalWidth = quarterTurn ? height : width, logicalHeight = quarterTurn ? width : height;
    double layerWidth = w * logicalWidth, layerHeight = h * logicalHeight;
    double dx = (x + w / 2 - 0.5) * logicalWidth, dy = (y + h / 2 - 0.5) * logicalHeight;
    double px = dx, py = dy;
    if (rotation == 90) { px = -dy; py = dx; }
    else if (rotation == 180) { px = -dx; py = -dy; }
    else if (rotation == 270) { px = dy; py = -dx; }
    return new double[] { width / 2 + px - layerWidth / 2, height / 2 + py - layerHeight / 2, layerWidth, layerHeight };
  }
}