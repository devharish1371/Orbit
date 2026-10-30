package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
public class TrackerPolicyTest {
    private TrackerPolicy.Fix f(double lat,double lng,double accuracy,long time){return new TrackerPolicy.Fix(lat,lng,accuracy,0,time,false);}
    @Test public void hysteresisRequiresTwoGoodFixesAndRejectsPoorAccuracy(){
        var old=new TrackerPolicy.Presence(false,0);var near=f(13,80,10,1000);
        var first=TrackerPolicy.evaluate(near,13,80,150,old);assertFalse(first.inside());
        var entered=TrackerPolicy.evaluate(near,13,80,150,first);assertTrue(entered.inside());
        var edge=f(13.0015,80,10,1000);assertTrue(TrackerPolicy.evaluate(edge,13,80,150,entered).inside());
        var far=f(13.002,80,10,1000);var leave=TrackerPolicy.evaluate(far,13,80,150,entered);assertTrue(leave.inside());
        assertFalse(TrackerPolicy.evaluate(far,13,80,150,leave).inside());
        assertEquals(0,TrackerPolicy.evaluate(f(13,80,500,1000),13,80,150,first).consecutive());
    }
    @Test public void privacyAndFiltering(){
        assertEquals(TrackerPolicy.snap(13.01),TrackerPolicy.snap(13.01001),0);
        assertTrue(TrackerPolicy.valid(f(13,80,10,999000),1000000,false));
        assertFalse(TrackerPolicy.valid(f(13,80,101,999000),1000000,false));
        assertTrue(TrackerPolicy.valid(f(13,80,101,999000),1000000,true));
        assertFalse(TrackerPolicy.valid(new TrackerPolicy.Fix(13,80,10,0,999000,true),1000000,false));
        assertFalse(TrackerPolicy.valid(f(13,80,10,900000),1000000,false));
        assertFalse(TrackerPolicy.valid(new TrackerPolicy.Fix(13,80,10,71,999000,false),1000000,false));
    }
    @Test public void batteryAndStillnessUseBoundedUploadRates(){
        assertEquals("low",TrackerPolicy.mode(15,false,null,null,0,1000000));
        assertEquals("still",TrackerPolicy.mode(15,true,null,null,0,1000000));
        assertEquals("moving",TrackerPolicy.mode(90,false,null,null,990000,1000000));
        assertEquals(30000,TrackerPolicy.gap("moving"));assertEquals(300000,TrackerPolicy.gap("still"));
        assertTrue(TrackerPolicy.history(f(13.001,80,10,1000),f(13,80,10,500)));
    }
}
