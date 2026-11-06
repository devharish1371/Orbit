package app.orbit.couple;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    volatile PrivacyGuard privacy;
    private String widgetRoute;
    @Override public void onCreate(Bundle savedInstanceState){
        setTheme(OrbitAppearance.launchTheme(this));
        androidx.core.splashscreen.SplashScreen.installSplashScreen(this).setOnExitAnimationListener(view -> view.remove());
        readWidgetRoute(getIntent());
        registerPlugin(ArchivePlugin.class); registerPlugin(SafetyPlugin.class); registerPlugin(SurfacePlugin.class); registerPlugin(TrackingPlugin.class); registerPlugin(PrivacyPlugin.class); registerPlugin(OutboxPlugin.class); registerPlugin(KeepsakesPlugin.class);
        if (getSharedPreferences("orbit-privacy",MODE_PRIVATE).getBoolean("lock",false) || getSharedPreferences("orbit-privacy",MODE_PRIVATE).getBoolean("screenshots",false))
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        super.onCreate(savedInstanceState); privacy = new PrivacyGuard(this);
    }
    @Override public void onPause(){ if (privacy != null) privacy.pause(); super.onPause(); }
    @Override public void onResume(){ super.onResume(); if (privacy != null) privacy.resume(); OrbitWidgetProvider.renderAll(this); }
    private void readWidgetRoute(android.content.Intent intent){String kind=intent==null?null:intent.getStringExtra("orbit_widget");if(intent!=null&&intent.getBooleanExtra("orbit_safety",false)){widgetRoute="/safety";return;}widgetRoute="photo".equals(kind)?"/keepsakes":"plan".equals(kind)?"/plans":"private".equals(kind)?"/":null;}
    synchronized String takeWidgetRoute(){String value=widgetRoute;widgetRoute=null;return value;}
    @Override protected void onNewIntent(android.content.Intent intent){super.onNewIntent(intent);readWidgetRoute(intent);if(getBridge()!=null){var h=getBridge().getPlugin("OrbitSurface");if(h!=null)((SurfacePlugin)h.getInstance()).widgetOpened();}}
    @Override public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);if(privacy!=null)privacy.apply();OrbitWidgetProvider.renderAll(this);}
    @Override public void onDestroy(){if(privacy!=null)privacy.destroy();super.onDestroy();}
    @Override protected void onActivityResult(int requestCode,int resultCode,android.content.Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == 7821 && getBridge() != null) {
            com.getcapacitor.PluginHandle handle = getBridge().getPlugin("OrbitPrivacy");
            if (handle != null) ((PrivacyPlugin)handle.getInstance()).legacyCredentialResult(resultCode == RESULT_OK);
        }
    }
}
