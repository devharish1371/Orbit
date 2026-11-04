package app.orbit.couple;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.List;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** Callers hold TrackerAuth.class before entering; logout uses the same lock order. */
final class KeepsakeFiles {
    static final long QUOTA=256L*1024*1024;
    private static final String PREFIX="OrbitKeepsakesV1_";
    private static File root(Context c) throws Exception {
        File f=new File(c.getNoBackupFilesDir(),"orbit-keepsakes");if(!f.isDirectory()&&!f.mkdirs())throw new Exception("COPY_STORAGE_FAILED");return f;
    }
    private static String identity(String owner,String couple,String id) throws Exception {return OutboxFiles.uuid(owner)+"_"+OutboxFiles.uuid(couple)+"_"+OutboxFiles.uuid(id);}
    private static SecretKey key(String owner) throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);String alias=PREFIX+OutboxFiles.uuid(owner);
        if(!store.containsAlias(alias)){
            KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());g.generateKey();
        }
        return ((KeyStore.SecretKeyEntry)store.getEntry(alias,null)).getSecretKey();
    }
    static long used(Context c) throws Exception {long size=0;File[] files=root(c).listFiles();if(files!=null)for(File f:files)size+=f.length();return size;}
    static KeepsakeRecord read(Context c,String owner,String couple,String id) throws Exception {
        String name=identity(owner,couple,id);AtomicFile f=new AtomicFile(new File(root(c),name+".keep"));
        if(f.getBaseFile().length()>KeepsakeRecord.MAX_MEDIA+KeepsakeRecord.MAX_META+34){f.delete();throw new Exception("COPY_INVALID");}
        try{return KeepsakeRecord.decrypt(f.readFully(),key(owner),name);}catch(Exception failure){f.delete();throw failure;}
    }
    static KeepsakeRecord put(Context c,String owner,String couple,String id,KeepsakeRecord record) throws Exception {
        String name=identity(owner,couple,id);File dir=root(c),target=new File(dir,name+".keep");byte[] data=record.encrypt(key(owner),name);
        File[] existing=dir.listFiles((d,n)->n.endsWith(".keep"));
        if((!target.exists()&&existing!=null&&existing.length>=1000)||used(c)-target.length()+data.length>QUOTA||dir.getUsableSpace()<data.length+32L*1024*1024)throw new Exception("PHONE_STORAGE_FULL");
        AtomicFile file=new AtomicFile(target);FileOutputStream stream=null;
        try{stream=file.startWrite();stream.write(data);file.finishWrite(stream);}catch(Exception failure){if(stream!=null)file.failWrite(stream);throw failure;}
        // A receipt is possible only after decrypting the committed file and checking its bytes.
        KeepsakeRecord verified=read(c,owner,couple,id);
        if(!verified.metadata.equals(record.metadata)||!verified.hash().equals(record.hash())){file.delete();throw new Exception("COPY_VERIFY_FAILED");}
        return verified;
    }
    static List<org.json.JSONObject> list(Context c,String owner,String couple) throws Exception {
        String prefix=OutboxFiles.uuid(owner)+"_"+OutboxFiles.uuid(couple)+"_";List<org.json.JSONObject> result=new ArrayList<>();
        File[] files=root(c).listFiles((d,n)->n.startsWith(prefix)&&(n.endsWith(".keep")||n.endsWith(".keep.bak")));
        java.util.Set<String> ids=new java.util.HashSet<>();if(files!=null)for(File file:files)ids.add(file.getName().substring(prefix.length()).replaceFirst("\\.keep(\\.bak)?$",""));
        for(String id:ids)try{KeepsakeRecord r=read(c,owner,couple,id);org.json.JSONObject meta=new org.json.JSONObject(r.metadata);meta.put("bytes",r.media.length);meta.put("sha256",r.hash());result.add(meta);}catch(Exception ignored){}return result;
    }
    static void remove(Context c,String owner,String couple,String id)throws Exception{new AtomicFile(new File(root(c),identity(owner,couple,id)+".keep")).delete();}
    static void clear(Context c){
        try{File[] files=root(c).listFiles();if(files!=null)for(File f:files)f.delete();}catch(Exception ignored){}
        try{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);var aliases=store.aliases();List<String> remove=new ArrayList<>();while(aliases.hasMoreElements()){String a=aliases.nextElement();if(a.startsWith(PREFIX))remove.add(a);}for(String a:remove)store.deleteEntry(a);}catch(Exception ignored){}
        c.getSharedPreferences("OrbitKeepsakes",0).edit().clear().commit();
    }
    private KeepsakeFiles(){}
}
