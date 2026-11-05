package app.orbit.couple;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Bounded authenticated record. Metadata and original media share one atomic identity. */
final class OutboxMediaRecord {
    static final int MAX_MEDIA=8*1024*1024, MAX_META=32768;
    final String metadata;
    final byte[] media;
    OutboxMediaRecord(String metadata,byte[] media) throws Exception {
        if(metadata.getBytes(StandardCharsets.UTF_8).length>MAX_META || media.length>MAX_MEDIA) throw new Exception("COPY_TOO_LARGE");
        this.metadata=metadata; this.media=media;
    }
    String hash() throws Exception {
        byte[] digest=MessageDigest.getInstance("SHA-256").digest(media);
        StringBuilder result=new StringBuilder();for(byte b:digest)result.append(String.format("%02x",b));return result.toString();
    }
    byte[] encrypt(SecretKey key,String identity) throws Exception {
        byte[] meta=metadata.getBytes(StandardCharsets.UTF_8);
        byte[] plain=ByteBuffer.allocate(4+meta.length+media.length).putInt(meta.length).put(meta).put(media).array();
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key);cipher.updateAAD(identity.getBytes(StandardCharsets.UTF_8));
        byte[] iv=cipher.getIV();if(iv.length!=12)throw new Exception("COPY_IV_INVALID");
        byte[] data=cipher.doFinal(plain);
        return ByteBuffer.allocate(14+data.length).put((byte)2).put((byte)12).put(iv).put(data).array();
    }
    static OutboxMediaRecord decrypt(byte[] stored,SecretKey key,String identity) throws Exception {
        if(stored.length<34 || stored.length>MAX_MEDIA+MAX_META+34 || stored[0]!=2 || stored[1]!=12)throw new Exception("COPY_INVALID");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Arrays.copyOfRange(stored,2,14)));cipher.updateAAD(identity.getBytes(StandardCharsets.UTF_8));
        byte[] plain=cipher.doFinal(stored,14,stored.length-14);int count=ByteBuffer.wrap(plain).getInt();
        if(count<2 || count>MAX_META || count>plain.length-4)throw new Exception("COPY_INVALID");
        return new OutboxMediaRecord(new String(plain,4,count,StandardCharsets.UTF_8),Arrays.copyOfRange(plain,4+count,plain.length));
    }
}
