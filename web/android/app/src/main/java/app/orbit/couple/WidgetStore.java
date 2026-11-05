package app.orbit.couple;
import android.content.*;
import android.security.keystore.*;
import android.util.AtomicFile;
import java.io.*;
import java.security.KeyStore;
import javax.crypto.*;
/** No network/auth-lock calls here. Epochs prevent late writes after privacy, clear or logout. */
final class WidgetStore {
    private static final String KEY="OrbitWidgetV1";
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("OrbitWidget",0);}
    static synchronized String generation(Context c){return prefs(c).getString("generation","");}
    private static AtomicFile file(Context c){return new AtomicFile(new File(c.getNoBackupFilesDir(),"orbit-widget.box"));}
    private static SecretKey key()throws Exception{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);if(!store.containsAlias(KEY)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());generator.generateKey();}return ((KeyStore.SecretKeyEntry)store.getEntry(KEY,null)).getSecretKey();}
    static synchronized WidgetSnapshot read(Context c)throws Exception{var p=prefs(c);String owner=p.getString("owner",""),couple=p.getString("couple","");if(owner.isEmpty()||file(c).getBaseFile().length()>WidgetSnapshot.MAX_IMAGE+8192)throw new Exception("WIDGET_UNAVAILABLE");KeepsakeRecord decoded=KeepsakeRecord.decrypt(file(c).readFully(),key(),owner+":"+couple+":widget-v1");WidgetSnapshot snapshot=WidgetSnapshot.unpack(decoded.media);if(!snapshot.matches(owner,couple,p.getString("id",""),p.getString("kind",""),p.getLong("revision",0)))throw new Exception("WIDGET_UNAVAILABLE");return snapshot;}
    static synchronized void put(Context c,WidgetSnapshot item,String expected)throws Exception{
        if(!generation(c).equals(expected))throw new Exception("WIDGET_CANCELLED");byte[] data=new KeepsakeRecord("{}",item.pack()).encrypt(key(),item.owner+":"+item.couple+":widget-v1");AtomicFile target=file(c);FileOutputStream stream=null;
        try{stream=target.startWrite();stream.write(data);target.finishWrite(stream);}catch(Exception error){if(stream!=null)target.failWrite(stream);throw error;}
        WidgetSnapshot verified=WidgetSnapshot.unpack(KeepsakeRecord.decrypt(target.readFully(),key(),item.owner+":"+item.couple+":widget-v1").media);
        if(!java.util.Arrays.equals(verified.pack(),item.pack()))throw new Exception("WIDGET_UNAVAILABLE");
        if(!prefs(c).edit().putString("owner",item.owner).putString("couple",item.couple).putString("id",item.id).putString("kind",item.kind).putLong("revision",item.revision).putBoolean("verified",true).commit())throw new Exception("WIDGET_UNAVAILABLE");
    }
    static synchronized void invalidate(Context c){prefs(c).edit().putBoolean("verified",false).putString("generation",java.util.UUID.randomUUID().toString()).commit();}
    static synchronized void clear(Context c){prefs(c).edit().clear().putString("generation",java.util.UUID.randomUUID().toString()).commit();file(c).delete();try{KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);store.deleteEntry(KEY);}catch(Exception ignored){}OrbitWidgetProvider.coverAll(c);}
}
