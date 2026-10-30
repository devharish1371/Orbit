package app.orbit.couple;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    PrivacyGuard privacy;
    @Override public void onCreate(Bundle savedInstanceState){
        registerPlugin(TrackingPlugin.class); registerPlugin(PrivacyPlugin.class);
        if (getSharedPreferences("orbit-privacy",MODE_PRIVATE).getBoolean("lock",false) || getSharedPreferences("orbit-privacy",MODE_PRIVATE).getBoolean("screenshots",false))
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        super.onCreate(savedInstanceState); privacy = new PrivacyGuard(this);
    }
    @Override public void onPause(){ if (privacy != null) privacy.pause(); super.onPause(); }
    @Override public void onResume(){ super.onResume(); if (privacy != null) privacy.resume(); }
    @Override protected void onActivityResult(int requestCode,int resultCode,android.content.Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == 7821 && getBridge() != null) {
            com.getcapacitor.PluginHandle handle = getBridge().getPlugin("OrbitPrivacy");
            if (handle != null) ((PrivacyPlugin)handle.getInstance()).legacyCredentialResult(resultCode == RESULT_OK);
        }
    }
}
