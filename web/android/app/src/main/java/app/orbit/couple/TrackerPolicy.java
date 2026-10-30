package app.orbit.couple;

/** Pure tracking math: no Android dependencies, shared by the service and JVM tests. */
public final class TrackerPolicy {
    public record Fix(double lat, double lng, double accuracy, double speed, long time, boolean mocked) {}
    public record Presence(boolean inside, int consecutive) {}
    public static double distance(double lat, double lng, double otherLat, double otherLng) {
        double a=Math.toRadians(otherLat-lat), b=Math.toRadians(otherLng-lng);
        double h=Math.pow(Math.sin(a/2),2)+Math.cos(Math.toRadians(lat))*Math.cos(Math.toRadians(otherLat))*Math.pow(Math.sin(b/2),2);
        return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
    }
    public static boolean valid(Fix f,long now,boolean allowPoorAccuracy) {
        return Double.isFinite(f.lat)&&Double.isFinite(f.lng)&&Math.abs(f.lat)<=90&&Math.abs(f.lng)<=180
            &&Double.isFinite(f.accuracy)&&f.accuracy>=0&&f.accuracy<=(allowPoorAccuracy?2000:100)
            &&f.time>now-60000&&f.time<=now+10000&&!f.mocked&&f.speed<=70;
    }
    public static double snap(double n) {return (Math.floor(n/0.018)+0.5)*0.018;}
    public static Presence evaluate(Fix f,double lat,double lng,int radius,Presence old) {
        if(f.accuracy>Math.max(100,radius))return new Presence(old.inside,0);
        double d=distance(f.lat,f.lng,lat,lng);
        boolean want=old.inside?d<radius*1.2:d<=radius;
        int count=want==old.inside?0:old.consecutive+1;
        return count>=2?new Presence(want,0):new Presence(old.inside,count);
    }
    public static String mode(int battery,boolean charging,Fix fix,Fix previous,long lastMovement,long now) {
        if(battery>=0&&battery<=15&&!charging)return "low";
        if(fix!=null&&((fix.speed>=1)||(previous!=null&&distance(fix.lat,fix.lng,previous.lat,previous.lng)>=50)))return "moving";
        return now-lastMovement>=180000?"still":"moving";
    }
    public static long gap(String mode) {return mode.equals("low")?120000:mode.equals("still")?300000:30000;}
    public static float displacement(String mode){return mode.equals("low")?100:mode.equals("still")?75:25;}
    public static boolean history(Fix f,Fix previous){return previous==null||f.time-previous.time>=300000||distance(f.lat,f.lng,previous.lat,previous.lng)>=30;}
    private TrackerPolicy() {}
}
