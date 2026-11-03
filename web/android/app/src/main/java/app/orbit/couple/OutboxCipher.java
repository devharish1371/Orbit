package app.orbit.couple;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Small authenticated records; the caller owns key storage and durable file writes. */
final class OutboxCipher {
    static byte[] encrypt(byte[] plain, SecretKey key, String identity) throws Exception {
        if (plain.length > 32768) throw new Exception("OUTBOX_RECORD_TOO_LARGE");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        cipher.updateAAD(identity.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV(), encrypted = cipher.doFinal(plain);
        if (iv.length != 12) throw new Exception("OUTBOX_IV_INVALID");
        byte[] result = new byte[14 + encrypted.length];
        result[0] = 1; result[1] = 12;
        System.arraycopy(iv, 0, result, 2, 12);
        System.arraycopy(encrypted, 0, result, 14, encrypted.length);
        return result;
    }
    static byte[] decrypt(byte[] stored, SecretKey key, String identity) throws Exception {
        if (stored.length < 30 || stored.length > 32798 || stored[0] != 1 || stored[1] != 12)
            throw new Exception("OUTBOX_RECORD_INVALID");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOfRange(stored, 2, 14)));
        cipher.updateAAD(identity.getBytes(StandardCharsets.UTF_8));
        return cipher.doFinal(stored, 14, stored.length - 14);
    }
    private OutboxCipher() {}
}
