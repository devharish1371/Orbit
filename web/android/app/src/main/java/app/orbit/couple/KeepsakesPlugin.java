package app.orbit.couple;

import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.UUID;
import org.json.JSONObject;

@CapacitorPlugin(name="OrbitKeepsakes")
public class KeepsakesPlugin extends Plugin {
    private ByteArrayOutputStream pending;
    private String pendingMeta,pendingOwner,pendingCouple,pendingId;
    private int expected;
    private KeepsakeRecord reading;
    private String readingOwner,readingCouple;
    private interface Work{JSObject run(String owner,String couple)throws Exception;}
    @PluginMethod public void identity(PluginCall call){getBridge().execute(()->{synchronized(TrackerAuth.class){try{
        var p=getContext().getSharedPreferences("OrbitKeepsakes",0);String raw=TrackerAuth.read(getContext()),owner=p.getString("owner",null),couple=p.getString("couple",null);
        if(raw==null||!p.getBoolean("enabled",false)||owner==null||couple==null||!owner.equals(new JSONObject(raw).getJSONObject("user").getString("id")))throw new Exception("COPIES_DISABLED");
        JSObject result=new JSObject();result.put("owner",owner);result.put("couple",couple);call.resolve(result);
    }catch(Exception failure){call.reject("COPIES_DISABLED");}}});}
    private void run(PluginCall call,boolean enabled,Work work){
        getBridge().execute(()->{synchronized(TrackerAuth.class){try{
            String owner=OutboxFiles.uuid(call.getString("owner")),couple=OutboxFiles.uuid(call.getString("couple"));String raw=TrackerAuth.read(getContext());
            if(raw==null||!owner.equals(new JSONObject(raw).getJSONObject("user").getString("id")))throw new Exception("ACCOUNT_CHANGED");
            var prefs=getContext().getSharedPreferences("OrbitKeepsakes",0);
            if(enabled&&(!prefs.getBoolean("enabled",false)||!owner.equals(prefs.getString("owner",null))||!couple.equals(prefs.getString("couple",null))))throw new Exception("COPIES_DISABLED");
            call.resolve(work.run(owner,couple));
        }catch(Exception failure){pending=null;reading=null;String code=failure.getMessage();call.reject("PHONE_STORAGE_FULL".equals(code)?code:"PHONE_COPY_UNAVAILABLE");}}});
    }
    @PluginMethod public void status(PluginCall call){run(call,false,(owner,couple)->{
        var p=getContext().getSharedPreferences("OrbitKeepsakes",0);String device=p.getString("device",null);if(device==null){device=UUID.randomUUID().toString();p.edit().putString("device",device).commit();}
        JSObject result=new JSObject();result.put("protocol",2);result.put("device",device);result.put("enabled",p.getBoolean("enabled",false)&&owner.equals(p.getString("owner",null))&&couple.equals(p.getString("couple",null)));result.put("used",KeepsakeFiles.used(getContext()));result.put("quota",KeepsakeFiles.QUOTA);return result;
    });}
    @PluginMethod public void configure(PluginCall call){run(call,false,(owner,couple)->{
        boolean enabled=Boolean.TRUE.equals(call.getBoolean("enabled"));var prefs=getContext().getSharedPreferences("OrbitKeepsakes",0);
        if(!enabled){KeepsakeFiles.clear(getContext());pending=null;reading=null;}
        else if(!owner.equals(prefs.getString("owner",owner))||!couple.equals(prefs.getString("couple",couple)))throw new Exception("ACCOUNT_CHANGED");
        prefs.edit().putString("owner",owner).putString("couple",couple).putBoolean("enabled",enabled).commit();return new JSObject();
    });}
    private JSObject description(KeepsakeRecord record)throws Exception{
        JSObject result=JSObject.fromJSONObject(new JSONObject(record.metadata));result.put("bytes",record.media.length);result.put("sha256",record.hash());return result;
    }
    @PluginMethod public void list(PluginCall call){run(call,true,(owner,couple)->{
        JSArray rows=new JSArray();for(JSONObject record:KeepsakeFiles.list(getContext(),owner,couple))rows.put(record);JSObject result=new JSObject();result.put("items",rows);return result;
    });}
    @PluginMethod public void begin(PluginCall call){run(call,true,(owner,couple)->{
        JSObject meta=call.getObject("metadata");if(meta==null)throw new Exception("INVALID_COPY");
        pendingId=KeepsakeIds.valid(meta.getString("id"));expected=call.getInt("bytes",-1);
        if(expected<0||expected>KeepsakeRecord.MAX_MEDIA||meta.toString().length()>KeepsakeRecord.MAX_META||meta.getInteger("revision",0)<1)throw new Exception("INVALID_COPY");
        pendingMeta=meta.toString();pendingOwner=owner;pendingCouple=couple;pending=new ByteArrayOutputStream();return new JSObject();
    });}
    @PluginMethod public void append(PluginCall call){run(call,true,(owner,couple)->{
        String value=call.getString("base64","");if(pending==null||!owner.equals(pendingOwner)||!couple.equals(pendingCouple)||value.length()>350000)throw new Exception("INVALID_COPY");
        byte[] bytes=Base64.decode(value,Base64.NO_WRAP);if(pending.size()+bytes.length>expected)throw new Exception("INVALID_COPY");pending.write(bytes);return new JSObject();
    });}
    @PluginMethod public void finish(PluginCall call){run(call,true,(owner,couple)->{
        if(pending==null||!owner.equals(pendingOwner)||!couple.equals(pendingCouple)||pending.size()!=expected)throw new Exception("INVALID_COPY");
        KeepsakeRecord record=new KeepsakeRecord(pendingMeta,pending.toByteArray());pending=null;
        return description(KeepsakeFiles.put(getContext(),owner,couple,pendingId,record));
    });}
    @PluginMethod public void remove(PluginCall call){run(call,true,(owner,couple)->{KeepsakeFiles.remove(getContext(),owner,couple,call.getString("id"));reading=null;return new JSObject();});}
    @PluginMethod public void open(PluginCall call){run(call,true,(owner,couple)->{reading=KeepsakeFiles.read(getContext(),owner,couple,call.getString("id"));readingOwner=owner;readingCouple=couple;return description(reading);});}
    @PluginMethod public void chunk(PluginCall call){run(call,true,(owner,couple)->{
        int offset=call.getInt("offset",-1);if(reading==null||!owner.equals(readingOwner)||!couple.equals(readingCouple)||offset<0||offset>reading.media.length)throw new Exception("INVALID_COPY");
        JSObject result=new JSObject();result.put("base64",Base64.encodeToString(Arrays.copyOfRange(reading.media,offset,Math.min(reading.media.length,offset+196608)),Base64.NO_WRAP));return result;
    });}
    @PluginMethod public void close(PluginCall call){run(call,false,(owner,couple)->{reading=null;pending=null;return new JSObject();});}
    @Override protected void handleOnPause(){synchronized(TrackerAuth.class){reading=null;pending=null;}super.handleOnPause();}
}
