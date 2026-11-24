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
  private final java.util.Map<String, PageState> pages = new java.util.HashMap<>();
  private static class PageState {
    WebView page; FrameLayout layer; String session; Runnable deadline; boolean loadFailed; boolean silent;
    android.view.View host; android.view.View.OnLayoutChangeListener layoutListener;
  }
  private final Handler timer = new Handler(Looper.getMainLooper());
  private void event(PageState p, String state) {
    JSObject data = new JSObject(); data.put("session", p.session); data.put("state", state);
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
  private void cancelDeadline(PageState p) { if (p.deadline != null) timer.removeCallbacks(p.deadline); }
  private void armDeadline(PageState p) {
    cancelDeadline(p); p.deadline = () -> { if (p.page != null) { p.loadFailed = true; p.page.stopLoading(); event(p, "error"); } };
    timer.postDelayed(p.deadline, 15000);
  }
  private void destroyPage(PageState p) {
    cancelDeadline(p); pages.remove(p.session);
    if (p.host != null && p.layoutListener != null) p.host.removeOnLayoutChangeListener(p.layoutListener);
    if (p.page != null) { p.page.stopLoading(); p.page.loadUrl("about:blank"); p.page.destroy(); p.page = null; }
    if (p.layer != null) { ViewGroup parent = (ViewGroup) p.layer.getParent(); if (parent != null) parent.removeView(p.layer); p.layer = null; }
    getBridge().getWebView().requestFocus();
  }
  @SuppressLint("SetJavaScriptEnabled")
  @PluginMethod public void open(PluginCall call) {
    String url = call.getString("url"); String requested = call.getString("session");
    if (url == null || requested == null || !allowed(url)) { call.reject("WEBPAGE_INVALID_URL"); return; }
    int rotation = call.getInt("rotation", 0);
    if (!DisplayRotationLayout.validRotation(rotation)) { call.reject("WEBPAGE_INVALID_ROTATION"); return; }
    JSObject rect = call.getObject("rectangle");
    double x = rect == null ? 0 : rect.optDouble("x", 0), y = rect == null ? 0 : rect.optDouble("y", 0);
    double w = rect == null ? 1 : rect.optDouble("width", 1), h = rect == null ? 1 : rect.optDouble("height", 1);
    try { DisplayRotationLayout.bounds(1, 1, rotation, x, y, w, h); }
    catch (IllegalArgumentException ignored) { call.reject("WEBPAGE_INVALID_RECT"); return; }
    getActivity().runOnUiThread(() -> {
      PageState old = pages.get(requested); if (old != null) destroyPage(old);
      if (pages.size() >= 4) { call.reject("WEBPAGE_LIMIT"); return; }
      PageState p = new PageState(); p.session = requested; p.silent = Boolean.TRUE.equals(call.getBoolean("muted", false));
      p.layer = new FrameLayout(getActivity()); p.page = new WebView(getActivity()); pages.put(requested, p);
      WebView page = p.page; FrameLayout layer = p.layer;
      WebSettings settings = page.getSettings();
      settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
      settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
      settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
      settings.setMediaPlaybackRequiresUserGesture(p.silent); settings.setCacheMode(WebSettings.LOAD_DEFAULT);
      page.setWebViewClient(new WebViewClient() {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !allowed(request.getUrl().toString()); }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String target) { return !allowed(target); }
        @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
          if (!allowed(request.getUrl().toString())) return new android.webkit.WebResourceResponse("text/plain", "UTF-8", new java.io.ByteArrayInputStream(new byte[0]));
          return null;
        }
        @Override public void onPageStarted(WebView view, String target, Bitmap icon) { p.loadFailed = false; armDeadline(p); }
        @Override public void onPageFinished(WebView view, String target) { if (view == p.page && !p.loadFailed && !"about:blank".equals(target)) { cancelDeadline(p); if (p.silent) view.evaluateJavascript("document.querySelectorAll('video,audio').forEach(function(e){e.muted=true;});", null); event(p,"loaded"); } }
        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) { if (request.isForMainFrame()) { p.loadFailed = true; cancelDeadline(p); event(p,"error"); } }
        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) { if (request.isForMainFrame() && response.getStatusCode() >= 400) { p.loadFailed = true; cancelDeadline(p); event(p,"error"); } }
      });
      page.setDownloadListener((a,b,c,d,e) -> {});
      page.setOnKeyListener((view, key, event) -> {
        if (key == KeyEvent.KEYCODE_BACK || key == KeyEvent.KEYCODE_MENU || key == KeyEvent.KEYCODE_MEDIA_NEXT) {
          if (event.getAction() == KeyEvent.ACTION_UP) { event(p,"back"); destroyPage(p); }
          return true;
        }
        return false; // D-pad and Enter navigate within the displayed page.
      });
      boolean fullscreen = Boolean.TRUE.equals(call.getBoolean("fullscreen", true));
      int inset = fullscreen ? 0 : Math.round(32 * getContext().getResources().getDisplayMetrics().density);
      FrameLayout.LayoutParams content = new FrameLayout.LayoutParams(-1, -1); content.setMargins(inset, inset, inset, inset);
      layer.addView(page, content);
      FrameLayout host = getActivity().findViewById(android.R.id.content);
      if (host == null || host.getWidth() <= 0 || host.getHeight() <= 0) { destroyPage(p); call.reject("WEBPAGE_INVALID_RECT"); return; }
      p.host = host;
      Runnable place = () -> {
        if (p.layer == null || host.getWidth() <= 0 || host.getHeight() <= 0) return;
        double[] b = DisplayRotationLayout.bounds(host.getWidth(), host.getHeight(), rotation, x, y, w, h);
        FrameLayout.LayoutParams bounds = new FrameLayout.LayoutParams(Math.max(1, (int)Math.round(b[2])), Math.max(1, (int)Math.round(b[3])), android.view.Gravity.TOP | android.view.Gravity.LEFT);
        bounds.leftMargin = (int)Math.round(b[0]); bounds.topMargin = (int)Math.round(b[1]);
        layer.setLayoutParams(bounds); layer.setPivotX(bounds.width / 2f); layer.setPivotY(bounds.height / 2f); layer.setRotation(rotation);
      };
      host.addView(layer); place.run();
      p.layoutListener = (view, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> { if (right-left != oldRight-oldLeft || bottom-top != oldBottom-oldTop) place.run(); };
      host.addOnLayoutChangeListener(p.layoutListener);
      page.requestFocus(); armDeadline(p); page.loadUrl(url); call.resolve();
    });
  }
  @PluginMethod public void close(PluginCall call) { getActivity().runOnUiThread(() -> { PageState p = pages.get(call.getString("session")); if (p != null) destroyPage(p); call.resolve(); }); }
  @PluginMethod public void reload(PluginCall call) { getActivity().runOnUiThread(() -> { PageState p = pages.get(call.getString("session")); if (p != null && p.page != null) { armDeadline(p); p.page.reload(); } call.resolve(); }); }
  @Override protected void handleOnDestroy() { getActivity().runOnUiThread(() -> { for (PageState p : new java.util.ArrayList<>(pages.values())) destroyPage(p); }); }
}
