package app.orbit.couple;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
/** Wakes the existing service only; never starts location tracking without consent. */
public class TrackerHeartbeat extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){OrbitTrackerService.heartbeat();}
}
