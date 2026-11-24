package app.screenflow.player;

public final class ApkUpdatePolicyTest {
  private static void check(boolean condition) { if (!condition) throw new AssertionError("Update policy failed"); }
  public static void main(String[] args) {
    String app = "app.screenflow.player";
    check(ApkUpdatePolicy.compatible(app, app, 2, 3, 3, new String[]{"original"}, new String[]{"original"}));
    check(!ApkUpdatePolicy.compatible(app, app, 2, 3, 3, new String[]{"original"}, new String[]{"new-ci-key"}));
    check(!ApkUpdatePolicy.compatible(app, "another.app", 2, 3, 3, new String[]{"original"}, new String[]{"original"}));
    check(!ApkUpdatePolicy.compatible(app, app, 2, 2, 3, new String[]{"original"}, new String[]{"original"}));
    check(!ApkUpdatePolicy.compatible(app, app, 2, 4, 3, new String[]{"original"}, new String[]{"original"}));
    check(!ApkUpdatePolicy.compatible(app, app, 2, 3, 3, new String[]{}, new String[]{}));
    check(!ApkUpdatePolicy.compatible(app, app, 2, 3, 3, null, new String[]{"original"}));
    System.out.println("7 APK compatibility checks passed");
  }
}