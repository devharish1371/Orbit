package app.orbit.couple;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name="OrbitTracking",permissions={
 @Permission(alias="location",strings={Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION}),
 @Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS}),
 @Permission(alias="background",strings={Manifest.permission.ACCESS_BACKGROUND_LOCATION})
})
public class TrackingPlugin extends Plugin {
    @PluginMethod public void pushConfiguration(PluginCall call){call.resolve(new JSObject().put("configured",getContext().getResources().getIdentifier("google_app_id","string",getContext().getPackageName())!=0));}
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private interface Action{JSObject run() throws Exception;}
    private void work(PluginCall call,Action action){worker.execute(()->{try{call.resolve(action.run());}catch(Exception error){call.reject("NATIVE_TRACKING_UNAVAILABLE");}});}
    static boolean granted(android.content.Context c,String permission){return ContextCompat.checkSelfPermission(c,permission)==PackageManager.PERMISSION_GRANTED;}
    static boolean ready(android.content.Context c){return granted(c,Manifest.permission.ACCESS_FINE_LOCATION)&&(Build.VERSION.SDK_INT<29||granted(c,Manifest.permission.ACCESS_BACKGROUND_LOCATION))&&(Build.VERSION.SDK_INT<33||granted(c,Manifest.permission.POST_NOTIFICATIONS));}
    @PluginMethod public void configure(PluginCall call){work(call,()->{TrackerAuth.configure(getContext(),call.getString("url",""),call.getString("publicKey",""));return new JSObject();});}
    @PluginMethod public void getAuth(PluginCall call){work(call,()->{String raw=TrackerAuth.read(getContext());if(raw!=null){try{TrackerAuth.refresh(getContext(),false);raw=TrackerAuth.read(getContext());}catch(Exception ignored){}}
        JSObject result=new JSObject();result.put("value",raw==null?JSONObject.NULL:raw);return result;});}
    @PluginMethod public void setAuth(PluginCall call){work(call,()->{
        String value=call.getString("value");if(value==null)throw new Exception();
        String previous=TrackerAuth.read(getContext());String nextUser=new JSONObject(value).getJSONObject("user").getString("id");
        if(previous!=null&&!new JSONObject(previous).getJSONObject("user").getString("id").equals(nextUser)){getContext().stopService(new Intent(getContext(),OrbitTrackerService.class));try(var store=new TrackerStore(getContext())){store.clear();}getContext().getSharedPreferences("OrbitTracking",0).edit().putBoolean("enabled",false).remove("policy").remove("presence").remove("places").remove("lastUpload").remove("lastFix").remove("diagnostics").remove("issue").commit();}
        TrackerAuth.save(getContext(),value);return new JSObject();});}
    @PluginMethod public void clearAuth(PluginCall call){work(call,()->{getContext().getSharedPreferences("OrbitTracking",0).edit().putBoolean("enabled",false).remove("pendingMode").remove("policy").remove("places").remove("presence").remove("lastUpload").remove("lastFix").remove("diagnostics").remove("issue").commit();getContext().stopService(new Intent(getContext(),OrbitTrackerService.class));TrackerAuth.clear(getContext());try(var store=new TrackerStore(getContext())){store.clear();}return new JSObject();});}
    @PluginMethod public void refreshAuth(PluginCall call){work(call,()->{try{var reply=TrackerAuth.refresh(getContext(),false);return new JSObject().put("status",reply.status()).put("data",reply.json());}catch(Exception error){return new JSObject().put("status",503).put("data",new JSONObject().put("message","Connection unavailable"));}});}
    @PluginMethod public void start(PluginCall call){
        if(!ready(getContext())){call.reject("TRACKING_PERMISSIONS_REQUIRED");return;}
        getContext().getSharedPreferences("OrbitTracking",0).edit().putBoolean("enabled",true).commit();
        try{ContextCompat.startForegroundService(getContext(),new Intent(getContext(),OrbitTrackerService.class));call.resolve();}catch(Exception error){getContext().getSharedPreferences("OrbitTracking",0).edit().putBoolean("enabled",false).commit();call.reject("TRACKING_START_FAILED");}
    }
    @PluginMethod public void mode(PluginCall call){try{
        String mode=call.getString("mode","");if(!mode.equals("live")&&!mode.equals("paused")&&!mode.equals("surprise"))throw new Exception();
        JSONObject pending=new JSONObject().put("share_mode",mode).put("share_mode_until",call.getString("until")==null?JSONObject.NULL:call.getString("until"));
        getContext().getSharedPreferences("OrbitTracking",0).edit().putString("pendingMode",pending.toString()).commit();
        try(var store=new TrackerStore(getContext())){store.clear();}
        OrbitTrackerService.wake();worker.execute(()->{try{TrackerAuth.syncMode(getContext());}catch(Exception error){TrackerStore.log(getContext(),"mode_pending");}});call.resolve();}catch(Exception error){call.reject("SHARING_CHANGE_FAILED");}}
    @PluginMethod public void retryMode(PluginCall call){worker.execute(()->{try{TrackerAuth.syncMode(getContext());}catch(Exception error){TrackerStore.log(getContext(),"mode_pending");}});call.resolve();}
    @PluginMethod public void health(PluginCall call){work(call,()->{
        var c=getContext();var prefs=c.getSharedPreferences("OrbitTracking",0);int boot=Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT,-1);
        JSObject result=new JSObject().put("native",true).put("location",granted(c,Manifest.permission.ACCESS_FINE_LOCATION)).put("background",Build.VERSION.SDK_INT<29||granted(c,Manifest.permission.ACCESS_BACKGROUND_LOCATION))
            .put("notifications",Build.VERSION.SDK_INT<33||granted(c,Manifest.permission.POST_NOTIFICATIONS)).put("battery",((PowerManager)c.getSystemService(android.content.Context.POWER_SERVICE)).isIgnoringBatteryOptimizations(c.getPackageName()))
            .put("services",Build.VERSION.SDK_INT>=28?((android.location.LocationManager)c.getSystemService(android.content.Context.LOCATION_SERVICE)).isLocationEnabled():((android.location.LocationManager)c.getSystemService(android.content.Context.LOCATION_SERVICE)).isProviderEnabled(android.location.LocationManager.GPS_PROVIDER)).put("enabled",prefs.getBoolean("enabled",false)).put("running",OrbitTrackerService.running()).put("lastUpload",prefs.getLong("lastUpload",0)).put("lastFix",prefs.getLong("lastFix",0))
            .put("issue",prefs.getString("issue","")).put("mode",prefs.getString("adaptive","moving")).put("pendingMode",prefs.contains("pendingMode")).put("auth",TrackerAuth.read(c)!=null).put("rebooted",prefs.getInt("boot",boot)!=boot)
            .put("manufacturer",Build.MANUFACTURER).put("model",Build.MODEL).put("os",Build.VERSION.RELEASE);
        try(var store=new TrackerStore(c)){result.put("queue",store.count());}
        return result;
    });}
    @PluginMethod public void diagnostics(PluginCall call){work(call,()->new JSObject().put("entries",new org.json.JSONArray(getContext().getSharedPreferences("OrbitTracking",0).getString("diagnostics","[]"))));}
    @PluginMethod public void openDeviceLocation(PluginCall call){startActivityForResult(call,new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS),"settingsResult");}
    @PluginMethod public void requestLocation(PluginCall call){requestPermissionForAlias("location",call,"permissionResult");}
    @PluginMethod public void requestNotifications(PluginCall call){if(Build.VERSION.SDK_INT>=33)requestPermissionForAlias("notifications",call,"permissionResult");else call.resolve();}
    @PermissionCallback private void permissionResult(PluginCall call){call.resolve();}
    @PluginMethod public void requestBackground(PluginCall call){if(Build.VERSION.SDK_INT==29)requestPermissionForAlias("background",call,"permissionResult");else openAppSettings(call);}
    @PluginMethod public void openAppSettings(PluginCall call){try{startActivityForResult(call,new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getContext().getPackageName())),"settingsResult");}catch(Exception error){call.reject("SETTINGS_UNAVAILABLE");}}
    @ActivityCallback private void settingsResult(PluginCall call,androidx.activity.result.ActivityResult result){if(call!=null)call.resolve();}
    @PluginMethod public void requestIgnore(PluginCall call){try{
        Intent intent=new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,Uri.parse("package:"+getContext().getPackageName()));
        if(intent.resolveActivity(getContext().getPackageManager())==null)intent=new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        startActivityForResult(call,intent,"settingsResult");
    }catch(Exception error){call.reject("BATTERY_SETTINGS_UNAVAILABLE");}}
}
