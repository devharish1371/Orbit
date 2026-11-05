package app.orbit.couple;
import android.app.KeyguardManager;
import android.content.*;
import android.os.*;
import android.animation.*;
import android.view.*;
import android.widget.FrameLayout;
/** Cover precedes the first WebView frame and stays until both auth and web readiness permit reveal. */
final class PrivacyGuard {
    final MainActivity activity;final SharedPreferences prefs;
    volatile boolean locked,authenticating;private volatile boolean ready,foreground;private boolean stalled;
    private long backgroundAt=-1,generation;private String ticket=java.util.UUID.randomUUID().toString();
    private OrbitLockCover cover;private final Handler handler=new Handler(Looper.getMainLooper());
    Runnable requestUnlock;
    PrivacyGuard(MainActivity activity){this.activity=activity;prefs=activity.getSharedPreferences("orbit-privacy",0);locked=enabled();apply();watch();}
    boolean enabled(){return prefs.getBoolean("lock",false);}boolean screenshots(){return prefs.getBoolean("screenshots",false);}
    boolean available(){KeyguardManager k=(KeyguardManager)activity.getSystemService(Context.KEYGUARD_SERVICE);return k!=null&&k.isDeviceSecure();}
    static boolean shouldLock(long start,long now){return EntrancePolicy.elapsed(start,now);}
    String ticket(){return ticket;}
    boolean interactive(){return ready&&!locked&&!authenticating&&foreground;}
    void loaded(String value){if(!EntrancePolicy.accept(ticket,value))return;ready=true;stalled=false;apply();}
    void watch(){String expected=ticket;handler.postDelayed(()->{if(!ready&&expected.equals(ticket)){stalled=true;apply();}},12000);}
    void reload(){if(locked||authenticating)return;ready=false;stalled=false;ticket=java.util.UUID.randomUUID().toString();apply();watch();if(activity.getBridge()!=null)activity.getBridge().getWebView().reload();}
    void apply(){
        OrbitPalette palette=OrbitAppearance.palette(activity);activity.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(palette.background));
        var bars=androidx.core.view.WindowCompat.getInsetsController(activity.getWindow(),activity.getWindow().getDecorView());bars.setAppearanceLightStatusBars(palette.light);bars.setAppearanceLightNavigationBars(palette.light);
        if(screenshots()||enabled())activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        show(EntrancePolicy.covered(ready,locked,authenticating,enabled(),foreground));
    }
    void pause(){foreground=false;if(authenticating)return;if(backgroundAt<0)backgroundAt=SystemClock.elapsedRealtime();apply();}
    void resume(){foreground=true;if(authenticating){apply();return;}if(enabled()&&shouldLock(backgroundAt,SystemClock.elapsedRealtime()))locked=true;backgroundAt=-1;apply();}
    void authenticated(){locked=false;backgroundAt=-1;authenticating=false;apply();}
    void configure(boolean lock,boolean block){WidgetStore.invalidate(activity);prefs.edit().putBoolean("lock",lock).putBoolean("screenshots",block).apply();locked=false;apply();OrbitWidgetProvider.coverAll(activity);OrbitWidgetProvider.refresh(activity);}
    private void show(boolean visible){
        long token=++generation;if(cover!=null){cover.animate().cancel();cover.setAlpha(1);}
        View web=activity.getBridge()==null?null:activity.getBridge().getWebView();if(web!=null){web.setVisibility(visible?View.INVISIBLE:View.VISIBLE);web.setImportantForAccessibility(visible?View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS:View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);web.setBackgroundColor(OrbitAppearance.palette(activity).background);}
        if(visible){if(cover==null){cover=new OrbitLockCover(activity,()->{if(!available()){activity.startActivity(new Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS));return;}if(requestUnlock!=null)requestUnlock.run();},this::reload);activity.addContentView(cover,new FrameLayout.LayoutParams(-1,-1));}cover.update(locked,authenticating,stalled);cover.setVisibility(View.VISIBLE);cover.bringToFront();return;}
        if(cover==null||cover.getVisibility()!=View.VISIBLE)return;
        if(OrbitAppearance.reduced(activity)||!foreground||(Build.VERSION.SDK_INT>=26&&!ValueAnimator.areAnimatorsEnabled())){cover.setVisibility(View.GONE);return;}
        cover.animate().alpha(0).setDuration(120).withEndAction(()->{if(token==generation&&!EntrancePolicy.covered(ready,locked,authenticating,enabled(),foreground)){cover.setVisibility(View.GONE);cover.setAlpha(1);}}).start();
    }
    void destroy(){ready=false;foreground=false;ticket=java.util.UUID.randomUUID().toString();generation++;handler.removeCallbacksAndMessages(null);if(cover!=null)cover.animate().cancel();}
}
