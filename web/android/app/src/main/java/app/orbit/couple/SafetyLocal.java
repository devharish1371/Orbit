package app.orbit.couple;
import android.app.*;
import android.content.*;
import android.location.Location;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
/** Local only. No network, extra sensors or service starts. Bound to the authenticated owner. */
final class SafetyLocal {
    private static SpeedPolicy detector=new SpeedPolicy();private static String identity="";
    static boolean notifications(Context c){if(!NotificationManagerCompat.from(c).areNotificationsEnabled())return false;if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).getNotificationChannel("orbit_speed");return channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE;}return true;}
    static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("OrbitSafety",0);}
    static synchronized void clear(Context c){prefs(c).edit().clear().commit();detector=new SpeedPolicy();identity="";NotificationManagerCompat.from(c).cancel(28359);}
    static synchronized void reset(){detector.reset();}
    static synchronized void fix(Context c,String owner,boolean live,Location fix){
        var p=prefs(c);String key=owner+":"+p.getInt("threshold",80);
        if(!p.getBoolean("enabled",false)||!owner.equals(p.getString("owner",""))||Build.VERSION.SDK_INT<26||!live){detector.reset();return;}
        if(!identity.equals(key)){identity=key;detector=new SpeedPolicy();}
        if(!fix.hasSpeed()||!fix.hasSpeedAccuracy()||!fix.hasAccuracy()){detector.reset();return;}
        long now=SystemClock.elapsedRealtime(),sample=fix.getElapsedRealtimeNanos()/1000000;
        boolean mocked=Build.VERSION.SDK_INT>=31?fix.isMock():fix.isFromMockProvider();
        if(!detector.accept(now,sample,fix.getSpeed(),fix.getSpeedAccuracyMetersPerSecond(),fix.getAccuracy(),p.getInt("threshold",80),live,mocked))return;
        int boot=android.provider.Settings.Global.getInt(c.getContentResolver(),android.provider.Settings.Global.BOOT_COUNT,-1);
        long last=p.getLong("lastPrompt",-1);
        // Persistent cooldown survives process recreation; reboot starts a fresh sustained window.
        if(boot==p.getInt("boot",-2)&&last>=0&&(now<last||now-last<900000))return;
        if(!p.edit().putInt("boot",boot).putLong("lastPrompt",now).putString("pending",java.util.UUID.randomUUID().toString()).putLong("pendingAt",System.currentTimeMillis()).commit())return;
        try{
            NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
            manager.createNotificationChannel(new NotificationChannel("orbit_speed","Speed reminders",NotificationManager.IMPORTANCE_DEFAULT));
            PendingIntent open=PendingIntent.getActivity(c,28359,new Intent(c,MainActivity.class).putExtra("orbit_safety",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            manager.notify(28359,new NotificationCompat.Builder(c,"orbit_speed").setSmallIcon(R.drawable.ic_tracking).setContentTitle("Orbit · speed reminder").setContentText("A sustained speed estimate passed your reminder. Review when safe.").setContentIntent(open).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build());
        }catch(SecurityException ignored){}
    }
}
