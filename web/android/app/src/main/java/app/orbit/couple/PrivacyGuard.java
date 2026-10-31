package app.orbit.couple;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;

/** A native cover is installed before the first WebView frame, independent of JS timers. */
final class PrivacyGuard {
    final MainActivity activity;
    final SharedPreferences prefs;
    boolean locked;
    boolean authenticating;
    private long backgroundAt = -1;
    private OrbitLockCover cover;
    Runnable requestUnlock;

    PrivacyGuard(MainActivity activity) {
        this.activity = activity;
        prefs = activity.getSharedPreferences("orbit-privacy", Context.MODE_PRIVATE);
        locked = enabled();
        apply();
    }
    boolean enabled() { return prefs.getBoolean("lock", false); }
    boolean screenshots() { return prefs.getBoolean("screenshots", false); }
    boolean available() {
        KeyguardManager keyguard = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
        return keyguard != null && keyguard.isDeviceSecure();
    }
    static boolean shouldLock(long backgroundAt, long now) {
        return backgroundAt >= 0 && now - backgroundAt >= 60000;
    }
    void apply() {
        if (screenshots() || enabled()) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        show(locked);
    }
    void pause() {
        if (authenticating) return;
        if (backgroundAt < 0) backgroundAt = SystemClock.elapsedRealtime();
        if (enabled()) show(true);
    }
    void resume() {
        if (authenticating) return;
        if (enabled() && shouldLock(backgroundAt, SystemClock.elapsedRealtime())) locked = true;
        backgroundAt = -1;
        apply();
    }
    void authenticated() { locked = false; backgroundAt = -1; authenticating = false; apply(); }
    void configure(boolean lock, boolean blockScreenshots) {
        prefs.edit().putBoolean("lock",lock).putBoolean("screenshots",blockScreenshots).apply();
        locked = false; apply();
    }
    private void show(boolean visible) {
        if (activity.getBridge() != null) {
            View webview = activity.getBridge().getWebView();
            webview.setVisibility(visible ? View.INVISIBLE : View.VISIBLE);
            webview.setImportantForAccessibility(visible ? View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS : View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
        }
        if (!visible) { if (cover != null) cover.setVisibility(View.GONE); return; }
        if (cover == null) {
            cover = new OrbitLockCover(activity, () -> { if (requestUnlock != null) requestUnlock.run(); });
            activity.addContentView(cover,new FrameLayout.LayoutParams(-1,-1));
        }
        cover.update(authenticating);
        cover.setVisibility(View.VISIBLE); cover.bringToFront();
        cover.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
    }
}
