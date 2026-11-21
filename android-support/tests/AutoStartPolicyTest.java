package app.screenflow.player;

public final class AutoStartPolicyTest {
  private static void check(boolean condition, String rule) {
    if (!condition) throw new AssertionError(rule);
  }
  public static void main(String[] args) {
    check(new AutoStartPolicy().allow("android.intent.action.BOOT_COMPLETED", 28, false, 0), "Android 9 boot starts");
    check(new AutoStartPolicy().allow("android.intent.action.MY_PACKAGE_REPLACED", 28, false, 0), "Own package update starts");
    check(!new AutoStartPolicy().allow("android.intent.action.PACKAGE_REPLACED", 28, false, 0), "Other packages cannot start the player");
    check(!new AutoStartPolicy().allow(null, 28, false, 0), "Null actions are rejected");
    for (int sdk : new int[] {29, 30, 33, 34, 35, 36}) {
      check(!new AutoStartPolicy().allow("android.intent.action.BOOT_COMPLETED", sdk, false, 0), "Restricted Android " + sdk);
      check(new AutoStartPolicy().allow("android.intent.action.BOOT_COMPLETED", sdk, true, 0), "Device owner Android " + sdk);
      check(!new AutoStartPolicy().allow("android.intent.action.MY_PACKAGE_REPLACED", sdk, false, 0), "Restricted update " + sdk);
    }
    AutoStartPolicy repeated = new AutoStartPolicy();
    check(repeated.allow("android.intent.action.BOOT_COMPLETED", 28, false, 0), "Initial start");
    check(!repeated.allow("android.intent.action.BOOT_COMPLETED", 28, false, 1), "Duplicate boot blocked");
    check(!repeated.allow("android.intent.action.MY_PACKAGE_REPLACED", 28, false, 9999), "Simultaneous update blocked");
    check(repeated.allow("android.intent.action.MY_PACKAGE_REPLACED", 28, false, 10000), "Later update permitted");
    check(new AutoStartPolicy().allow("android.intent.action.BOOT_COMPLETED", 28, false, 0), "Fresh process after reboot starts");
    System.out.println("AutoStartPolicy: all native policy checks passed");
  }
}