package app.orbit.couple;

import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

/** Bounded ZIP STORE proof. The full document and every entry are read back. */
final class ArchiveZipProof {
    static final int LIMIT=16*1024*1024;
    static final class Entry {
        final int bytes; final String sha;
        Entry(int bytes,String sha){this.bytes=bytes;this.sha=sha;}
    }
    static String hex(byte[] bytes){StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
    static void verify(byte[] zip,int bytes,String sha,Map<String,Entry> expected)throws Exception {
        if(zip.length!=bytes||bytes<22||bytes>LIMIT||expected.size()<3||expected.size()>22||!hex(MessageDigest.getInstance("SHA-256").digest(zip)).equals(sha))throw new IOException("BACKUP_VERIFY_FAILED");
        Set<String> seen=new HashSet<>();long total=0;
        try(ZipInputStream in=new ZipInputStream(new ByteArrayInputStream(zip))){
            ZipEntry entry;byte[] chunk=new byte[32768];
            while((entry=in.getNextEntry())!=null){
                String name=entry.getName();Entry proof=expected.get(name);
                if(proof==null||!name.matches("[a-zA-Z0-9_./-]+")||name.startsWith("/")||Arrays.asList(name.split("/")).contains("..")||!seen.add(name)||entry.getMethod()!=ZipEntry.STORED||entry.getSize()!=proof.bytes||proof.bytes<0)throw new IOException("BACKUP_VERIFY_FAILED");
                MessageDigest digest=MessageDigest.getInstance("SHA-256");int count=0,n;
                while((n=in.read(chunk))!=-1){count+=n;total+=n;if(count>proof.bytes||total>LIMIT)throw new IOException("BACKUP_VERIFY_FAILED");digest.update(chunk,0,n);}
                if(count!=proof.bytes||!hex(digest.digest()).equals(proof.sha))throw new IOException("BACKUP_VERIFY_FAILED");
                in.closeEntry();
            }
        }
        if(!seen.equals(expected.keySet()))throw new IOException("BACKUP_VERIFY_FAILED");
    }
}
