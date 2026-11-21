package app.screenflow.player;

import android.app.admin.DevicePolicyManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

/** Runs only after credential-encrypted storage is available. Never reads tokens. */
public final class BootReceiver extends BroadcastReceiver {
  private static final AutoStartPolicy POLICY = new AutoStartPolicy();

  @Override public void onReceive(Context context, Intent event) {
    if (event == null) return;
    try {
      DevicePolicyManager manager = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
      boolean deviceOwner = manager != null && manager.isDeviceOwnerApp(context.getPackageName());
      if (!POLICY.allow(event.getAction(), Build.VERSION.SDK_INT, deviceOwner, SystemClock.elapsedRealtime())) {
        Log.i("ScreenFlowAutoStart", "No background start: use the Android default HOME app on restricted devices.");
        return;
      }
      Intent launch = new Intent(context, MainActivity.class);
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
      context.startActivity(launch);
    } catch (RuntimeException exception) {
      // OEM restrictions may reject a start even on old versions. No retry loop,
      // alarms, foreground services or credential changes on failure.
      Log.w("ScreenFlowAutoStart", "Automatic launch unavailable; open the player or configure default HOME.");
    }
  }
}