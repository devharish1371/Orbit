package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
public class OutboxCipherTest {
    private SecretKey key() throws Exception { KeyGenerator g=KeyGenerator.getInstance("AES");g.init(256);return g.generateKey(); }
    @Test public void encryptedRecordsUseFreshIvsAndRoundTrip() throws Exception {
        SecretKey key=key();byte[] text="Disposable queued text".getBytes(StandardCharsets.UTF_8);
        byte[] first=OutboxCipher.encrypt(text,key,"owner:id"),second=OutboxCipher.encrypt(text,key,"owner:id");
        assertFalse(Arrays.equals(first,second));assertArrayEquals(text,OutboxCipher.decrypt(first,key,"owner:id"));
        assertFalse(new String(first,StandardCharsets.UTF_8).contains("Disposable queued text"));
    }
    @Test public void alteredIdentityWrongKeysAndTamperingFailClosed() throws Exception {
        SecretKey key=key();byte[] encrypted=OutboxCipher.encrypt(new byte[]{1,2,3},key,"owner:id");
        assertThrows(Exception.class,()->OutboxCipher.decrypt(encrypted,key,"other:id"));
        assertThrows(Exception.class,()->OutboxCipher.decrypt(encrypted,key(),"owner:id"));
        encrypted[encrypted.length-1]^=1;
        assertThrows(Exception.class,()->OutboxCipher.decrypt(encrypted,key,"owner:id"));
    }
    @Test public void malformedAndOversizedRecordsAreRejected() throws Exception {
        SecretKey key=key();assertThrows(Exception.class,()->OutboxCipher.encrypt(new byte[32769],key,"owner:id"));
        assertThrows(Exception.class,()->OutboxCipher.decrypt(new byte[4],key,"owner:id"));
        byte[] encrypted=OutboxCipher.encrypt(new byte[]{1},key,"owner:id");encrypted[0]=99;
        assertThrows(Exception.class,()->OutboxCipher.decrypt(encrypted,key,"owner:id"));
    }
}
