package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
public class EntrancePolicyTest {
 @Test public void noReadinessOrFailedAuthenticationCanRevealPersonalContent(){
  assertTrue(EntrancePolicy.covered(false,false,false,false,true));
  assertTrue(EntrancePolicy.covered(true,true,false,true,true));
  assertTrue(EntrancePolicy.covered(true,true,true,true,true));
  assertTrue(EntrancePolicy.covered(true,false,false,true,false));
  assertTrue(EntrancePolicy.covered(true,false,true,false,true));
  assertFalse(EntrancePolicy.covered(true,false,false,true,true));
 }
 @Test public void anOldPageCannotReleaseANewerReloadCover(){assertFalse(EntrancePolicy.accept("new-load","old-load"));assertFalse(EntrancePolicy.accept(null,null));assertTrue(EntrancePolicy.accept("new-load","new-load"));}
 @Test public void everySupportedAccentKeepsNativeTextReadable(){for(boolean light:new boolean[]{true,false})for(String accent:new String[]{"#000000","#FFFFFF","#FF6B8A","#24BCA0","#7C5CFF","#E4AA36","invalid"}){OrbitPalette p=new OrbitPalette(light,accent);assertTrue(OrbitPalette.contrast(p.text,p.background)>7);assertTrue(OrbitPalette.contrast(p.muted,p.background)>=4.5);assertTrue(OrbitPalette.contrast(p.accent,p.background)>=4.5);assertTrue(OrbitPalette.contrast(p.buttonText,p.button)>=4.5);}}
}
