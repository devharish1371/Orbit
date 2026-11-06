package app.orbit.couple;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.*;
import org.json.*;

@CapacitorPlugin(name="OrbitArchive")
public class ArchivePlugin extends Plugin {
    private OutputStream output; private Uri destination; private String owner,couple,sha;
    private int expected,written; private boolean choosing; private Map<String,ArchiveZipProof.Entry> entries;
    private void account(PluginCall call)throws Exception{
        String raw=TrackerAuth.read(getContext());
        if(raw==null||!Objects.equals(owner,call.getString("owner"))||!Objects.equals(couple,call.getString("couple"))||!owner.equals(new JSONObject(raw).getJSONObject("user").getString("id")))throw new IOException();
        var p=getContext().getSharedPreferences("OrbitKeepsakes",0);
        if(!p.getBoolean("enabled",false)||!owner.equals(p.getString("owner",null))||!couple.equals(p.getString("couple",null)))throw new IOException();
        PrivacyGuard guard=((MainActivity)getActivity()).privacy;if(guard!=null&&guard.locked)throw new IOException();
    }
    @PluginMethod public synchronized void begin(PluginCall call){
        try{
            if(choosing||output!=null)throw new IOException();
            PrivacyGuard screen=((MainActivity)getActivity()).privacy;if(screen==null||!screen.interactive())throw new IOException();
            owner=OutboxFiles.uuid(call.getString("owner"));couple=OutboxFiles.uuid(call.getString("couple"));account(call);
            expected=call.getInt("bytes",0);sha=call.getString("sha256","");String id=OutboxFiles.uuid(call.getString("archive"));
            if(expected<22||expected>ArchiveZipProof.LIMIT||!sha.matches("[0-9a-f]{64}"))throw new IOException();
            JSArray proofs=call.getArray("entries");if(proofs==null||proofs.length()<3||proofs.length()>22)throw new IOException();entries=new HashMap<>();
            for(int i=0;i<proofs.length();i++){JSONObject p=proofs.getJSONObject(i);String name=p.getString("name"),hash=p.getString("sha256");int bytes=p.getInt("bytes");if(bytes<0||bytes>ArchiveZipProof.LIMIT||!hash.matches("[0-9a-f]{64}")||entries.put(name,new ArchiveZipProof.Entry(bytes,hash))!=null)throw new IOException();}
            choosing=true;
            startActivityForResult(call,new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/zip").putExtra(Intent.EXTRA_TITLE,"orbit-archive-"+id+".zip"),"chosen");
        }catch(Exception error){cleanup();call.reject("BACKUP_UNAVAILABLE");}
    }
    @ActivityCallback private synchronized void chosen(PluginCall call,ActivityResult result){
        choosing=false;if(call==null){cleanup();return;}
        if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null){cleanup();call.resolve(new JSObject().put("cancelled",true));return;}
        try{account(call);destination=result.getData().getData();output=getContext().getContentResolver().openOutputStream(destination,"wt");written=0;if(output==null)throw new IOException();call.resolve(new JSObject().put("cancelled",false));}
        catch(Exception error){cleanup();call.reject("BACKUP_UNAVAILABLE");}
    }
    @PluginMethod public synchronized void append(PluginCall call){try{account(call);String raw=call.getString("base64","");if(output==null||raw.length()>262144)throw new IOException();byte[] data=Base64.decode(raw,Base64.NO_WRAP);if(written+data.length>expected)throw new IOException();output.write(data);written+=data.length;call.resolve();}catch(Exception e){cleanup();call.reject("BACKUP_UNAVAILABLE");}}
    @PluginMethod public void finish(PluginCall call){getBridge().execute(()->{synchronized(this){synchronized(TrackerAuth.class){try{
        account(call);if(output==null||written!=expected)throw new IOException();output.flush();output.close();output=null;
        ByteArrayOutputStream data=new ByteArrayOutputStream();try(InputStream input=getContext().getContentResolver().openInputStream(destination)){if(input==null)throw new IOException();byte[] chunk=new byte[32768];int n;while((n=input.read(chunk))!=-1){if(data.size()+n>expected)throw new IOException();data.write(chunk,0,n);}}
        ArchiveZipProof.verify(data.toByteArray(),expected,sha,entries);account(call);
        destination=null;entries=null;call.resolve(new JSObject().put("sha256",sha).put("bytes",expected));
    }catch(Exception error){cleanup();call.reject("BACKUP_VERIFY_FAILED");}}}});}
    @PluginMethod public synchronized void cancel(PluginCall call){cleanup();call.resolve();}
    private void cleanup(){try{if(output!=null)output.close();}catch(Exception ignored){}output=null;try{if(destination!=null)DocumentsContract.deleteDocument(getContext().getContentResolver(),destination);}catch(Exception ignored){}destination=null;entries=null;choosing=false;}
    @Override protected synchronized void handleOnPause(){if(!choosing)cleanup();super.handleOnPause();}
    @Override protected synchronized void handleOnDestroy(){cleanup();super.handleOnDestroy();}
}
