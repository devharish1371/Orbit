package app.orbit.couple;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.location.*;
import android.net.*;
import android.os.*;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;

/** Unbound foreground service: location, queue, HTTP and refresh never need a WebView. */
public class OrbitTrackerService extends Service {
    private static volatile OrbitTrackerService current;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ScheduledExecutorService worker=Executors.newSingleThreadScheduledExecutor();
    private TrackerStore store; private LocationManager manager; private ConnectivityManager connectivity;
    private JSONObject policy; private JSONArray places=new JSONArray(); private JSONObject presence=new JSONObject();
    private TrackerPolicy.Fix latest,previous,history;
    private long lastMovement=System.currentTimeMillis(),lastGood=System.currentTimeMillis(),lastAccepted=0,lastSent=0,lastSync=0,lastPlaces=0,lastSwitch=0,nextAttempt=0;
    private long backoff=5000;private String adaptive="moving",watching="";private boolean lowArmed=true,destroyed=false;
    private int battery=-1;private boolean charging=false;
    private final LocationListener listener=new LocationListener(){
        @Override public void onLocationChanged(Location location){if(!worker.isShutdown())submit(()->accept(location));}
        @Override public void onProviderDisabled(String provider){TrackerStore.log(OrbitTrackerService.this,"location_disabled");}
        @Override public void onProviderEnabled(String provider){}
    };
    private final ConnectivityManager.NetworkCallback network=new ConnectivityManager.NetworkCallback(){
        @Override public void onAvailable(Network n){if(!worker.isShutdown())submit(()->{nextAttempt=0;tickCore();});}
    };
    public static boolean running(){return current!=null;}
    public static void wake(){OrbitTrackerService service=current;if(service!=null){service.stopLocations();service.main.post(()->{try{service.showNotification(true);}catch(Exception ignored){}});if(!service.worker.isShutdown())service.submit(()->{service.lastSync=0;service.nextAttempt=0;service.tickCore();});}}
    public static void heartbeat(){OrbitTrackerService service=current;if(service!=null){service.scheduleHeartbeat();service.submit(service::tickCore);}}
    private void submit(Runnable task){
        if(worker.isShutdown())return;
        PowerManager.WakeLock lock=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"orbit:upload");lock.acquire(90000);
        try{worker.execute(()->{try{task.run();}finally{if(lock.isHeld())lock.release();}});}catch(RejectedExecutionException error){if(lock.isHeld())lock.release();}
    }
    private PendingIntent alarmIntent(){return PendingIntent.getBroadcast(this,1,new Intent(this,TrackerHeartbeat.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private void scheduleHeartbeat(){((AlarmManager)getSystemService(ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,SystemClock.elapsedRealtime()+300000,alarmIntent());}
    private android.content.SharedPreferences prefs(){return getSharedPreferences("OrbitTracking",0);}
    static String iso(long time){SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.US);f.setTimeZone(TimeZone.getTimeZone("UTC"));return f.format(new Date(time));}
    @Override public void onCreate(){super.onCreate();current=this;store=new TrackerStore(this);manager=(LocationManager)getSystemService(LOCATION_SERVICE);connectivity=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        try{policy=new JSONObject(prefs().getString("policy","null"));places=new JSONArray(prefs().getString("places","[]"));presence=new JSONObject(prefs().getString("presence","{}"));}catch(Exception ignored){}
        try{connectivity.registerDefaultNetworkCallback(network);}catch(Exception ignored){}
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(!prefs().getBoolean("enabled",false)||!TrackingPlugin.ready(this)){stopSelf();return START_NOT_STICKY;}
        try{showNotification(false);}catch(Exception error){TrackerStore.log(this,"service_permission_error");stopSelf();return START_NOT_STICKY;}
        if(intent!=null&&intent.getBooleanExtra("started",false))return START_STICKY;
        prefs().edit().putInt("boot",Settings.Global.getInt(getContentResolver(),Settings.Global.BOOT_COUNT,-1)).apply();
        TrackerStore.log(this,"service_started");watch();scheduleHeartbeat();
        if(intent!=null)intent.putExtra("started",true);
        // onStartCommand may be called again when reopening an already-running service.
        if(lastAccepted==0){lastAccepted=-1;worker.scheduleWithFixedDelay(this::tick,0,15,TimeUnit.SECONDS);}
        return START_STICKY;
    }
    private void showNotification(boolean paused){
        NotificationManager notifications=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26)notifications.createNotificationChannel(new NotificationChannel("orbit_tracking","Location sharing",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new NotificationCompat.Builder(this,"orbit_tracking").setSmallIcon(R.drawable.ic_tracking)
            .setContentTitle(paused?"Orbit · sharing paused":"Orbit · staying connected")
            .setContentText(paused?"Location is paused. Open Orbit to resume.":"Sharing location with your person. Open Orbit to pause.")
            .setOngoing(true).setOnlyAlertOnce(true).setContentIntent(open).setCategory(NotificationCompat.CATEGORY_SERVICE).build();
        if(Build.VERSION.SDK_INT>=29)startForeground(28352,notification,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);else startForeground(28352,notification);
    }
    private void stopLocations(){main.post(()->{try{manager.removeUpdates(listener);}catch(Exception ignored){}watching="";});}
    private void watch(){
        if(policy==null||policy.optString("share_mode").equals("paused")||prefs().contains("pendingMode")){stopLocations();return;}
        String desired=adaptive;
        main.post(()->{
            if(destroyed||watching.equals(desired)||prefs().contains("pendingMode"))return;
            try{
                manager.removeUpdates(listener);
                long interval=desired.equals("low")?60000:desired.equals("still")?30000:15000;
                for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER})if(manager.isProviderEnabled(provider))manager.requestLocationUpdates(provider,interval,TrackerPolicy.displacement(desired),listener,Looper.getMainLooper());
                watching=desired;TrackerStore.log(this,"watch_"+desired);
            }catch(SecurityException error){TrackerStore.log(this,"location_permission_error");stopSelf();}
        });
    }
    private JSONObject require(TrackerAuth.Reply reply) throws Exception {
        if(reply.status()==401||reply.status()==403){TrackerStore.log(this,"auth_required");stopLocations();throw new Exception("auth");}
        if(reply.status()<200||reply.status()>=300)throw new Exception("http");
        return reply.body().startsWith("[")?new JSONObject().put("rows",new JSONArray(reply.body())):reply.json();
    }
    private static long parseTime(String text) {
        try {String normalized=text.replaceAll("\\.([0-9]{3})[0-9]+",".$1");String pattern=normalized.contains(".")?"yyyy-MM-dd'T'HH:mm:ss.SSSXXX":"yyyy-MM-dd'T'HH:mm:ssXXX";return new SimpleDateFormat(pattern,Locale.US).parse(normalized).getTime();}catch(Exception ignored){return Long.MAX_VALUE;}
    }
    private void sync(long now) throws Exception {
        String raw=TrackerAuth.read(this);if(raw==null){stopSelf();throw new Exception("auth");}
        String uid=new JSONObject(raw).getJSONObject("user").getString("id");
        if(prefs().contains("pendingMode")){
            stopLocations();TrackerAuth.syncMode(this);lastSync=0;store.clear();
        }
        if(now-lastSync>=60000){
            JSONArray rows=require(TrackerAuth.request(this,"GET","/rest/v1/members?user_id=eq."+uid+"&select=user_id,couple_id,share_mode,share_mode_until,location_epoch",null)).getJSONArray("rows");
            if(rows.length()!=1){stopSelf();throw new Exception("membership");}
            JSONObject next=rows.getJSONObject(0);
            if(policy==null||policy.optLong("location_epoch")!=next.getLong("location_epoch")||!policy.optString("user_id").equals(uid)){
                store.clear();latest=null;history=null;previous=null;lastSent=0;presence=new JSONObject();lastPlaces=0;
                TrackerStore.log(this,"privacy_generation_changed");
            }
            String until=next.optString("share_mode_until","");
            if(!next.optString("share_mode").equals("live")&&!until.isEmpty()&&!until.equals("null")&&parseTime(until)<=now){
                prefs().edit().putString("pendingMode",new JSONObject().put("share_mode","live").put("share_mode_until",JSONObject.NULL).toString()).commit();store.clear();stopLocations();lastSync=0;return;
            }
            policy=next;prefs().edit().putString("policy",policy.toString()).apply();lastSync=now;
            showNotification(policy.getString("share_mode").equals("paused"));
        }
        if(policy==null)return;
        if(now-lastPlaces>=300000){
            places=require(TrackerAuth.request(this,"GET","/rest/v1/places?couple_id=eq."+policy.getString("couple_id")+"&select=id,lat,lng,radius_m,notify_arrive,notify_leave",null)).getJSONArray("rows");
            JSONArray rows=require(TrackerAuth.request(this,"GET","/rest/v1/place_presence?user_id=eq."+uid+"&select=place_id,inside",null)).getJSONArray("rows");
            if(store.count()==0){presence=new JSONObject();for(int i=0;i<rows.length();i++){JSONObject row=rows.getJSONObject(i);presence.put(row.getString("place_id"),new JSONObject().put("inside",row.getBoolean("inside")).put("consecutive",0));}}
            lastPlaces=now;prefs().edit().putString("places",places.toString()).putString("presence",presence.toString()).apply();
        }
        watch();
    }
    private void battery(){Intent info=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));if(info!=null){int level=info.getIntExtra(BatteryManager.EXTRA_LEVEL,-1),scale=info.getIntExtra(BatteryManager.EXTRA_SCALE,100);battery=level<0?-1:Math.min(100,Math.round(level*100f/Math.max(1,scale)));charging=info.getIntExtra(BatteryManager.EXTRA_PLUGGED,0)!=0;}}
    private void accept(Location location){
        if(destroyed||policy==null||prefs().contains("pendingMode")||policy.optString("share_mode").equals("paused"))return;
        long now=System.currentTimeMillis();boolean mocked=Build.VERSION.SDK_INT>=31?location.isMock():location.isFromMockProvider();
        TrackerPolicy.Fix fix=new TrackerPolicy.Fix(location.getLatitude(),location.getLongitude(),location.getAccuracy(),location.hasSpeed()?location.getSpeed():-1,location.getTime(),mocked);
        if(!TrackerPolicy.valid(fix,now,now-lastGood>600000)){TrackerStore.log(this,"fix_filtered");return;}
        if(previous!=null&&fix.time()<=previous.time())return;
        if(previous!=null&&TrackerPolicy.distance(fix.lat(),fix.lng(),previous.lat(),previous.lng())/((fix.time()-previous.time())/1000.0)>70){TrackerStore.log(this,"gps_jump_filtered");return;}
        if(fix.accuracy()<=100)lastGood=now;
        if(fix.speed()>=1||(previous!=null&&TrackerPolicy.distance(fix.lat(),fix.lng(),previous.lat(),previous.lng())>=50))lastMovement=now;
        battery();String desired=TrackerPolicy.mode(battery,charging,fix,previous,lastMovement,now);
        if(!desired.equals(adaptive)&&now-lastSwitch>=60000){adaptive=desired;lastSwitch=now;prefs().edit().putString("adaptive",adaptive).apply();watch();}
        latest=fix;previous=fix;lastAccepted=now;prefs().edit().putLong("lastFix",fix.time()).apply();
        try{
            if(now-lastSent>=TrackerPolicy.gap(adaptive)){
                boolean surprise=policy.optString("share_mode").equals("surprise");boolean record=!surprise&&TrackerPolicy.history(fix,history);
                JSONObject row=row(fix,record,surprise,location.hasBearing()?location.getBearing():null);
                store.add("fix",row);lastSent=now;if(record)history=fix;
                if(!surprise)geofences(fix);
                flush(now);
            }
        }catch(Exception error){failed(now);}
    }
    private JSONObject row(TrackerPolicy.Fix fix,boolean record,boolean surprise,Float bearing) throws Exception {
        return new JSONObject().put("client_id",UUID.randomUUID().toString()).put("lat",surprise?TrackerPolicy.snap(fix.lat()):fix.lat()).put("lng",surprise?TrackerPolicy.snap(fix.lng()):fix.lng())
            .put("accuracy_m",surprise?2000:fix.accuracy()).put("speed_mps",surprise||fix.speed()<0?JSONObject.NULL:fix.speed()).put("heading",surprise||bearing==null?JSONObject.NULL:bearing)
            .put("battery_pct",battery<0?JSONObject.NULL:battery).put("charging",charging).put("is_moving",fix.speed()>=1).put("fuzzed",surprise).put("recorded_at",iso(fix.time())).put("history",record);
    }
    private void geofences(TrackerPolicy.Fix fix) throws Exception {
        for(int i=0;i<places.length();i++){
            JSONObject place=places.getJSONObject(i);String id=place.getString("id");JSONObject old=presence.optJSONObject(id);
            TrackerPolicy.Presence before=new TrackerPolicy.Presence(old!=null&&old.optBoolean("inside"),old==null?0:old.optInt("consecutive"));
            var after=TrackerPolicy.evaluate(fix,place.getDouble("lat"),place.getDouble("lng"),place.getInt("radius_m"),before);
            presence.put(id,new JSONObject().put("inside",after.inside()).put("consecutive",after.consecutive()));
            if(after.inside()!=before.inside())store.add("transition",new JSONObject().put("id",UUID.randomUUID().toString()).put("place_id",id).put("inside",after.inside()).put("recorded_at",iso(fix.time())));
        }
        prefs().edit().putString("presence",presence.toString()).apply();
    }
    private void tick(){
        PowerManager.WakeLock lock=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"orbit:heartbeat");lock.acquire(90000);
        try{tickCore();}finally{if(lock.isHeld())lock.release();}
    }
    private void tickCore(){
        if(destroyed||!prefs().getBoolean("enabled",false)){stopSelf();return;}
        long now=System.currentTimeMillis();if(now<nextAttempt)return;
        try{
            sync(now);
            if(policy==null||policy.optString("share_mode").equals("paused")||prefs().contains("pendingMode"))return;
            battery();
            if(latest!=null&&now-lastSent>=300000){store.add("fix",row(latest,false,policy.optString("share_mode").equals("surprise"),null));lastSent=now;}
            flush(now);
        }catch(Exception error){failed(now);}
    }
    private void failed(long now){nextAttempt=now+backoff;backoff=Math.min(300000,backoff*2);TrackerStore.log(this,"network_retry");}
    private void flush(long now) throws Exception {
        if(now<nextAttempt||policy==null||prefs().contains("pendingMode"))return;
        var items=store.batch();if(items.isEmpty())return;
        JSONArray fixes=new JSONArray(),transitions=new JSONArray();for(var item:items){if(item.kind().equals("fix"))fixes.put(item.value());else transitions.put(item.value());}
        boolean low=lowArmed&&battery>=0&&battery<=15&&!charging;if(battery>25||charging)lowArmed=true;
        var response=TrackerAuth.requestAs(this,policy.getString("user_id"),"POST","/rest/v1/rpc/submit_locations",new JSONObject().put("p_epoch",policy.getLong("location_epoch")).put("p_fixes",fixes).put("p_transitions",transitions).put("p_low_battery",low));
        if(response.status()==400&& (response.body().contains("LOCATION_EPOCH_CHANGED")||response.body().contains("SHARING_PAUSED"))){store.clear();lastSync=0;stopLocations();TrackerStore.log(this,"privacy_queue_discarded");return;}
        if(response.status()==400&&response.body().contains("FUTURE_FIX")){store.acknowledge(items);prefs().edit().putString("issue","clock").apply();TrackerStore.log(this,"clock_check");nextAttempt=now+300000;return;}
        require(response);prefs().edit().remove("issue").apply();store.acknowledge(items);if(low)lowArmed=false;nextAttempt=0;backoff=5000;prefs().edit().putLong("lastUpload",now).apply();TrackerStore.log(this,"upload_ok");
    }
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onTaskRemoved(Intent rootIntent){TrackerStore.log(this,"task_swiped_service_retained");super.onTaskRemoved(rootIntent);}
    @Override public void onDestroy(){destroyed=true;current=null;((AlarmManager)getSystemService(ALARM_SERVICE)).cancel(alarmIntent());stopLocations();try{connectivity.unregisterNetworkCallback(network);}catch(Exception ignored){}worker.shutdownNow();new Thread(()->{try{worker.awaitTermination(35,TimeUnit.SECONDS);}catch(InterruptedException ignored){}finally{store.close();}},"orbit-tracker-close").start();TrackerStore.log(this,"service_stopped");super.onDestroy();}
}
