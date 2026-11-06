package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
public class ArchiveZipProofTest {
    static String sha(byte[] data)throws Exception{return ArchiveZipProof.hex(MessageDigest.getInstance("SHA-256").digest(data));}
    static byte[] zip(Map<String,byte[]> files)throws Exception{ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(ZipOutputStream out=new ZipOutputStream(bytes)){for(var row:files.entrySet()){CRC32 crc=new CRC32();crc.update(row.getValue());ZipEntry e=new ZipEntry(row.getKey());e.setMethod(ZipEntry.STORED);e.setSize(row.getValue().length);e.setCompressedSize(row.getValue().length);e.setCrc(crc.getValue());out.putNextEntry(e);out.write(row.getValue());out.closeEntry();}}return bytes.toByteArray();}
    @Test public void completeReadbackAndFailureCases()throws Exception{
        Map<String,byte[]> files=new LinkedHashMap<>();files.put("snapshot.json",new byte[]{1});files.put("files.json",new byte[]{2});files.put("media/0_photo.webp",new byte[]{3,4});
        Map<String,ArchiveZipProof.Entry> proof=new HashMap<>();for(var row:files.entrySet())proof.put(row.getKey(),new ArchiveZipProof.Entry(row.getValue().length,sha(row.getValue())));
        byte[] data=zip(files);ArchiveZipProof.verify(data,data.length,sha(data),proof);
        assertThrows(IOException.class,()->ArchiveZipProof.verify(data,data.length+1,sha(data),proof));
        assertThrows(IOException.class,()->ArchiveZipProof.verify(data,data.length,"a".repeat(64),proof));
        Map<String,ArchiveZipProof.Entry> wrong=new HashMap<>(proof);wrong.put("media/0_photo.webp",new ArchiveZipProof.Entry(2,"a".repeat(64)));
        assertThrows(IOException.class,()->ArchiveZipProof.verify(data,data.length,sha(data),wrong));
        files.put("../unsafe",new byte[]{5});byte[] unsafe=zip(files);proof.put("../unsafe",new ArchiveZipProof.Entry(1,sha(new byte[]{5})));
        assertThrows(IOException.class,()->ArchiveZipProof.verify(unsafe,unsafe.length,sha(unsafe),proof));
    }
}
