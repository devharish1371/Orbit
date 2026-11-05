package app.orbit.couple;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="OrbitSafety")
public class SafetyPlugin extends Plugin {
    private void owner(PluginCall call)throws Exception{if(!WidgetEngine.uid(getContext()).equals(OutboxFiles.uuid(call.getString("owner"))))throw new Exception("ACCOUNT_CHANGED");}
    private JSObject state(){var p=SafetyLocal.prefs(getContext());boolean same=p.getString("owner","").equals(getContext().getSharedPreferences("OrbitAuth",0).getString("owner",""));return new JSObject().put("supported",Build.VERSION.SDK_INT>=26).put("enabled",same&&p.getBoolean("enabled",false)).put("threshold",same?p.getInt("threshold",80):80).put("running",OrbitTrackerService.running()).put("notifications",SafetyLocal.notifications(getContext())).put("pendingId",same?p.getString("pending",null):null).put("pendingAt",same?p.getLong("pendingAt",0):0);}
    @PluginMethod public void status(PluginCall call){getBridge().execute(()->{try{synchronized(TrackerAuth.class){owner(call);call.resolve(state());}}catch(Exception e){call.reject("SAFETY_UNAVAILABLE");}});}
    @PluginMethod public void configure(PluginCall call){getBridge().execute(()->{try{synchronized(TrackerAuth.class){owner(call);MainActivity a=(MainActivity)getActivity();if(a.privacy==null||!a.privacy.interactive())throw new Exception();boolean enabled=Boolean.TRUE.equals(call.getBoolean("enabled",false));int threshold=call.getInt("threshold",80);if(threshold!=60&&threshold!=80&&threshold!=100&&threshold!=120)throw new Exception();if(enabled&&(Build.VERSION.SDK_INT<26||!OrbitTrackerService.running()||!TrackingPlugin.ready(getContext())||!SafetyLocal.notifications(getContext()))){call.reject("TRACKING_REQUIRED");return;}SafetyLocal.clear(getContext());if(!SafetyLocal.prefs(getContext()).edit().putString("owner",call.getString("owner")).putBoolean("enabled",enabled).putInt("threshold",threshold).commit())throw new Exception();call.resolve(state());}}catch(Exception e){call.reject("SAFETY_UNAVAILABLE");}});}
    @PluginMethod public void dismiss(PluginCall call){getBridge().execute(()->{try{synchronized(TrackerAuth.class){owner(call);var p=SafetyLocal.prefs(getContext());String expected=call.getString("id","");if(expected.equals(p.getString("pending",""))){p.edit().remove("pending").remove("pendingAt").commit();NotificationManagerCompat.from(getContext()).cancel(28359);}call.resolve(state());}}catch(Exception e){call.reject("SAFETY_UNAVAILABLE");}});}
}
