package app.screenflow.player;

/** No Android dependencies: tested on the JVM, also used by the real receiver. */
public final class AutoStartPolicy {
  private long lastAttempt = -1;

  public synchronized boolean allow(String action, int sdk, boolean deviceOwner, long elapsedMs) {
    if (!"android.intent.action.BOOT_COMPLETED".equals(action)
        && !"android.intent.action.MY_PACKAGE_REPLACED".equals(action)) return false;
    // Android 10+ blocks ordinary background starts. HOME is launched by Android,
    // not by this receiver; an externally managed device-owner is an exception.
    if (sdk >= 29 && !deviceOwner) return false;
    if (lastAttempt >= 0 && elapsedMs >= lastAttempt && elapsedMs - lastAttempt < 10000) return false;
    lastAttempt = elapsedMs;
    return true;
  }
}