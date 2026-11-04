package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Arrays;
public class KeepsakeRecordTest {
    private SecretKey key()throws Exception{KeyGenerator g=KeyGenerator.getInstance("AES");g.init(256);return g.generateKey();}
    @Test public void mediaAndMetadataRoundTripWithFreshIvs()throws Exception{
        SecretKey key=key();KeepsakeRecord r=new KeepsakeRecord("{\"body\":\"Private\"}",new byte[]{1,2,3});
        byte[] first=r.encrypt(key,"owner:couple:post"),second=r.encrypt(key,"owner:couple:post");
        assertFalse(Arrays.equals(first,second));KeepsakeRecord restored=KeepsakeRecord.decrypt(first,key,"owner:couple:post");
        assertEquals(r.metadata,restored.metadata);assertArrayEquals(r.media,restored.media);assertEquals(r.hash(),restored.hash());
        assertEquals(64,r.hash().length());
    }
    @Test public void tamperingWrongIdentityWrongKeyAndOversizeFailClosed()throws Exception{
        SecretKey key=key();KeepsakeRecord r=new KeepsakeRecord("{}",new byte[]{4});byte[] encrypted=r.encrypt(key,"A:C:P");
        assertThrows(Exception.class,()->KeepsakeRecord.decrypt(encrypted,key,"B:C:P"));
        assertThrows(Exception.class,()->KeepsakeRecord.decrypt(encrypted,key(),"A:C:P"));
        encrypted[encrypted.length-1]^=1;assertThrows(Exception.class,()->KeepsakeRecord.decrypt(encrypted,key,"A:C:P"));
        assertThrows(Exception.class,()->new KeepsakeRecord("{}",new byte[KeepsakeRecord.MAX_MEDIA+1]));
        assertThrows(Exception.class,()->new KeepsakeRecord("x".repeat(KeepsakeRecord.MAX_META+1),new byte[0]));
    }
    @Test public void textOnlyCopiesHaveKnownEmptyMediaHash()throws Exception{
        KeepsakeRecord r=new KeepsakeRecord("{}",new byte[0]);assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",r.hash());
        SecretKey key=key();assertEquals(0,KeepsakeRecord.decrypt(r.encrypt(key,"unused"),key,"unused").media.length);
    }
}
