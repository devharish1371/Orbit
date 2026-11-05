package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
public class SpeedPolicyTest {
 @Test public void sustainedQualityAndHysteresis(){SpeedPolicy p=new SpeedPolicy();for(int i=0;i<3;i++)assertFalse(p.accept(i*15000,i*15000,30,1,12,80,true,false));assertTrue(p.accept(45000,45000,30,1,12,80,true,false));assertFalse(p.accept(950000,950000,30,1,12,80,true,false));assertFalse(p.accept(960000,960000,0,1,12,80,true,false));for(int i=0;i<3;i++)assertFalse(p.accept(975000+i*15000,975000+i*15000,30,1,12,80,true,false));assertTrue(p.accept(1020000,1020000,30,1,12,80,true,false));}
 @Test public void uncertainMissingMockedStaleAndPrivateDoNotPrompt(){for(int mode=0;mode<6;mode++){SpeedPolicy p=new SpeedPolicy();for(int i=0;i<10;i++)assertFalse(p.accept(i*15000,i*15000-(mode==0?11000:0),mode==1?23:30,mode==2?-1:1,mode==3?120:12,80,mode!=4,mode==5));}}
 @Test public void gapDuplicatesAndClockRollbackDoNotCompleteWindow(){SpeedPolicy p=new SpeedPolicy();assertFalse(p.accept(1000,1000,30,1,12,80,true,false));for(int i=0;i<5;i++)assertFalse(p.accept(1000,1000,30,1,12,80,true,false));assertFalse(p.accept(40000,40000,30,1,12,80,true,false));assertFalse(p.accept(55000,55000,30,1,12,80,true,false));assertFalse(p.accept(70000,70000,30,1,12,80,true,false));assertTrue(p.accept(85000,85000,30,1,12,80,true,false));assertFalse(p.accept(10,10,30,1,12,80,true,false));}
}
