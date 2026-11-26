package app.screenflow.player;

import android.os.StatFs;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Internal data volume capacity; no storage permission or device identity access. */
@CapacitorPlugin(name = "DeviceStorage")
public class DeviceStoragePlugin extends Plugin {
  @PluginMethod public void read(PluginCall call) {
    try {
      StatFs stats = new StatFs(getContext().getFilesDir().getAbsolutePath());
      JSObject result = new JSObject();
      result.put("storage_total_bytes", stats.getTotalBytes());
      result.put("storage_available_bytes", stats.getAvailableBytes());
      result.put("storage_source", "device");
      call.resolve(result);
    } catch (Exception ignored) {
      call.reject("Storage unavailable", "STORAGE_UNAVAILABLE");
    }
  }
}