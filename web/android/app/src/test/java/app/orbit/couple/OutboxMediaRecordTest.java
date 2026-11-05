package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Arrays;
public class OutboxMediaRecordTest {
    private SecretKey key()throws Exception{KeyGenerator g=KeyGenerator.getInstance("AES");g.init(256);return g.generateKey();}
    @Test public void mediaAndUnicodeMetadataRoundTripWithFreshNonces()throws Exception{
        String meta="{\"caption\":\""+"日".repeat(8000)+"\"}";SecretKey key=key();OutboxMediaRecord r=new OutboxMediaRecord(meta,new byte[]{1,2,3,4});
        byte[] first=r.encrypt(key,"owner:post:media-v2"),second=r.encrypt(key,"owner:post:media-v2");
        assertFalse(Arrays.equals(first,second));OutboxMediaRecord restored=OutboxMediaRecord.decrypt(first,key,"owner:post:media-v2");
        assertEquals(meta,restored.metadata);assertArrayEquals(r.media,restored.media);assertEquals(r.hash(),restored.hash());
    }
    @Test public void identityFormatKeyAndTamperingCannotAliasAnotherRecord()throws Exception{
        SecretKey key=key();byte[] encrypted=new OutboxMediaRecord("{}",new byte[]{5}).encrypt(key,"A:P:media-v2");
        assertThrows(Exception.class,()->OutboxMediaRecord.decrypt(encrypted,key,"B:P:media-v2"));
        assertThrows(Exception.class,()->OutboxMediaRecord.decrypt(encrypted,key(),"A:P:media-v2"));
        assertThrows(Exception.class,()->KeepsakeRecord.decrypt(encrypted,key,"A:P:media-v2"));
        encrypted[encrypted.length-1]^=1;assertThrows(Exception.class,()->OutboxMediaRecord.decrypt(encrypted,key,"A:P:media-v2"));
        assertThrows(Exception.class,()->new OutboxMediaRecord("{}",new byte[OutboxMediaRecord.MAX_MEDIA+1]));
        assertThrows(Exception.class,()->new OutboxMediaRecord("x".repeat(OutboxMediaRecord.MAX_META+1),new byte[1]));
    }
}
