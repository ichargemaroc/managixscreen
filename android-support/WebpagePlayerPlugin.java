package app.screenflow.player;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** External content uses a separate WebView with NO Capacitor bridge or JavascriptInterface. */
@CapacitorPlugin(name = "WebpagePlayer")
public class WebpagePlayerPlugin extends Plugin {
  private WebView page;
  private FrameLayout layer;
  private String session;
  private final Handler timer = new Handler(Looper.getMainLooper());
  private Runnable deadline;
  private boolean loadFailed;
  private void event(String state) {
    JSObject data = new JSObject(); data.put("session", session); data.put("state", state);
    notifyListeners("webpageState", data);
  }
  private boolean allowed(String value) {
    try {
      Uri uri = Uri.parse(value); String scheme = uri.getScheme(); String host = uri.getHost();
      if (!("https".equals(scheme) || "http".equals(scheme)) || host == null || uri.getUserInfo() != null) return false;
      host = host.toLowerCase(java.util.Locale.ROOT);
      return !host.equals("localhost") && !host.endsWith(".localhost") && !host.endsWith(".local") && !host.contains(":") &&
        !host.matches("^(127\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.|0\\.).*");
    } catch (Exception ignored) { return false; }
  }
  private void cancelDeadline() { if (deadline != null) timer.removeCallbacks(deadline); }
  private void armDeadline() {
    cancelDeadline(); deadline = () -> { if (page != null) { loadFailed = true; page.stopLoading(); event("error"); } };
    timer.postDelayed(deadline, 15000);
  }
  private void destroyPage() {
    cancelDeadline();
    if (page != null) { page.stopLoading(); page.loadUrl("about:blank"); page.destroy(); page = null; }
    if (layer != null) { ViewGroup parent = (ViewGroup) layer.getParent(); if (parent != null) parent.removeView(layer); layer = null; }
    getBridge().getWebView().requestFocus();
  }
  @SuppressLint("SetJavaScriptEnabled")
  @PluginMethod public void open(PluginCall call) {
    String url = call.getString("url"); String requested = call.getString("session");
    if (url == null || requested == null || !allowed(url)) { call.reject("WEBPAGE_INVALID_URL"); return; }
    getActivity().runOnUiThread(() -> {
      destroyPage(); session = requested;
      layer = new FrameLayout(getActivity()); page = new WebView(getActivity());
      WebSettings settings = page.getSettings();
      settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
      settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
      settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
      settings.setMediaPlaybackRequiresUserGesture(false); settings.setCacheMode(WebSettings.LOAD_DEFAULT);
      page.setWebViewClient(new WebViewClient() {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !allowed(request.getUrl().toString()); }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String target) { return !allowed(target); }
        @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
          if (!allowed(request.getUrl().toString())) return new android.webkit.WebResourceResponse("text/plain", "UTF-8", new java.io.ByteArrayInputStream(new byte[0]));
          return null;
        }
        @Override public void onPageStarted(WebView view, String target, Bitmap icon) { loadFailed = false; armDeadline(); }
        @Override public void onPageFinished(WebView view, String target) { if (view == page && !loadFailed && !"about:blank".equals(target)) { cancelDeadline(); event("loaded"); } }
        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) { if (request.isForMainFrame()) { loadFailed = true; cancelDeadline(); event("error"); } }
        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) { if (request.isForMainFrame() && response.getStatusCode() >= 400) { loadFailed = true; cancelDeadline(); event("error"); } }
      });
      page.setDownloadListener((a,b,c,d,e) -> {});
      page.setOnKeyListener((view, key, event) -> {
        if (key == KeyEvent.KEYCODE_BACK || key == KeyEvent.KEYCODE_MENU || key == KeyEvent.KEYCODE_MEDIA_NEXT) {
          if (event.getAction() == KeyEvent.ACTION_UP) { event("back"); destroyPage(); }
          return true;
        }
        return false; // D-pad and Enter navigate within the displayed page.
      });
      boolean fullscreen = Boolean.TRUE.equals(call.getBoolean("fullscreen", true));
      int inset = fullscreen ? 0 : Math.round(32 * getContext().getResources().getDisplayMetrics().density);
      FrameLayout.LayoutParams content = new FrameLayout.LayoutParams(-1, -1); content.setMargins(inset, inset, inset, inset);
      layer.addView(page, content);
      getActivity().addContentView(layer, new ViewGroup.LayoutParams(-1, -1));
      page.requestFocus(); armDeadline(); page.loadUrl(url); call.resolve();
    });
  }
  @PluginMethod public void close(PluginCall call) { getActivity().runOnUiThread(() -> { if (session != null && session.equals(call.getString("session"))) destroyPage(); call.resolve(); }); }
  @PluginMethod public void reload(PluginCall call) { getActivity().runOnUiThread(() -> { if (page != null && session != null && session.equals(call.getString("session"))) { armDeadline(); page.reload(); } call.resolve(); }); }
  @Override protected void handleOnDestroy() { getActivity().runOnUiThread(this::destroyPage); }
}