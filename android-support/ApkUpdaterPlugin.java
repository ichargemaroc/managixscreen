package app.screenflow.player;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/** Downloads a GitHub Release APK and hands it to the system installer (user confirmation remains Android's). */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
  @PluginMethod public void install(PluginCall call) {
    String url = call.getString("url", "");
    int versionCode = call.getInt("versionCode", 0);
    String sha = call.getString("sha256", null);
    if (!url.matches("^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/download/\\S+\\.apk$")) { call.reject("Invalid", "INVALID_APK"); return; }
    try {
      PackageInfo current = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
      long installed = Build.VERSION.SDK_INT >= 28 ? current.getLongVersionCode() : current.versionCode;
      if (versionCode <= installed) { JSObject r = new JSObject(); r.put("status", "up_to_date"); call.resolve(r); return; }
    } catch (Exception ignored) {}
    if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
      Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
      settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try { getContext().startActivity(settings); } catch (Exception ignored) {}
      call.reject("Permission", "INSTALL_PERMISSION"); return;
    }
    new Thread(() -> {
      File dir = new File(getContext().getCacheDir(), "updates");
      File apk = new File(dir, "screenflow-update.apk");
      try {
        dir.mkdirs();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(15000); conn.setReadTimeout(30000); conn.setInstanceFollowRedirects(true);
        if (conn.getResponseCode() != 200) throw new Exception("http");
        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
          byte[] buf = new byte[65536]; int n;
          while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); digest.update(buf, 0, n); }
        }
        if (sha != null) {
          StringBuilder hex = new StringBuilder(); for (byte b : digest.digest()) hex.append(String.format("%02x", b));
          if (!hex.toString().equals(sha)) { apk.delete(); call.reject("Checksum", "CHECKSUM"); return; }
        }
        PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getPath(), 0);
        if (info == null || !getContext().getPackageName().equals(info.packageName)) { apk.delete(); call.reject("Invalid", "INVALID_APK"); return; }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".updates", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject r = new JSObject(); r.put("status", "installer_opened"); call.resolve(r);
      } catch (Exception e) { apk.delete(); call.reject("Download", "DOWNLOAD_FAILED"); }
    }).start();
  }
}
