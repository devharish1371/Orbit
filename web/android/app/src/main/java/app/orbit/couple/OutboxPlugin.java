package app.orbit.couple;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;

@CapacitorPlugin(name="OrbitOutbox")
public class OutboxPlugin extends Plugin {
    private ByteArrayOutputStream pending;
    private OutboxMediaRecord reading;
    private String pendingOwner,pendingId,pendingMeta,readingOwner;
    private long pendingGeneration,readingGeneration;
    private int expected;
    interface Work { JSObject run() throws Exception; }
    private void reset(){pending=null;reading=null;pendingMeta=null;pendingOwner=null;readingOwner=null;}
    private void run(PluginCall call, Work work) {
        getBridge().execute(() -> {synchronized(TrackerAuth.class){try {call.resolve(work.run());}catch(Exception failure){reset();String code=failure.getMessage();call.reject("OUTBOX_FULL".equals(code)?code:"OUTBOX_STORAGE_UNAVAILABLE");}}});
    }
    private String owner(PluginCall call) throws Exception {
        String expected=OutboxFiles.uuid(call.getString("owner")),raw=TrackerAuth.read(getContext());
        if(raw==null||!expected.equals(new JSONObject(raw).getJSONObject("user").getString("id")))throw new Exception("OUTBOX_ACCOUNT_CHANGED");return expected;
    }
    private JSONObject metadata(String uid,String id,String value)throws Exception{
        JSONObject item=new JSONObject(value);
        if(!uid.equals(item.getString("owner"))||!id.equals(item.getString("id")))throw new Exception("INVALID_OUTBOX_OWNER");
        return item;
    }
    @PluginMethod public void put(PluginCall call){long generation=OutboxFiles.generation(getContext());run(call,()->{
        String uid=owner(call),id=OutboxFiles.uuid(call.getString("id")),value=call.getString("value");JSONObject item=metadata(uid,id,value);
        if(item.getInt("version")==2)OutboxFiles.mediaMetadata(getContext(),uid,id,value,generation);
        else OutboxFiles.put(getContext(),uid,id,value,generation);return new JSObject();
    });}
    @PluginMethod public void list(PluginCall call){long generation=OutboxFiles.generation(getContext());run(call,()->{
        JSObject result=new JSObject();result.put("values",new JSArray(OutboxFiles.list(getContext(),owner(call),generation)));return result;
    });}
    @PluginMethod public void remove(PluginCall call){long generation=OutboxFiles.generation(getContext());run(call,()->{
        OutboxFiles.remove(getContext(),owner(call),call.getString("id"),generation);reading=null;return new JSObject();
    });}
    @PluginMethod public void begin(PluginCall call){long generation=OutboxFiles.generation(getContext());run(call,()->{
        String uid=owner(call),id=OutboxFiles.uuid(call.getString("id")),value=call.getString("value");JSONObject item=metadata(uid,id,value);expected=call.getInt("bytes",-1);
        if(item.getInt("version")!=2||expected<1||expected>OutboxMediaRecord.MAX_MEDIA||value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>OutboxMediaRecord.MAX_META)throw new Exception("INVALID_PENDING_MEDIA");
        reset();pendingOwner=uid;pendingId=id;pendingMeta=value;pendingGeneration=generation;pending=new ByteArrayOutputStream();return new JSObject();
    });}
    @PluginMethod public void append(PluginCall call){run(call,()->{
        String uid=owner(call),value=call.getString("base64","");
        if(pending==null||!uid.equals(pendingOwner)||pendingGeneration!=OutboxFiles.generation(getContext())||value.length()>350000)throw new Exception("OUTBOX_CLEARED");
        byte[] bytes=Base64.decode(value,Base64.NO_WRAP);if(pending.size()+bytes.length>expected)throw new Exception("INVALID_PENDING_MEDIA");pending.write(bytes);return new JSObject();
    });}
    @PluginMethod public void finish(PluginCall call){run(call,()->{
        String uid=owner(call);if(pending==null||!uid.equals(pendingOwner)||pending.size()!=expected)throw new Exception("INVALID_PENDING_MEDIA");
        OutboxMediaRecord record=new OutboxMediaRecord(pendingMeta,pending.toByteArray());pending=null;
        OutboxFiles.mediaPut(getContext(),uid,pendingId,record,pendingGeneration);reset();return new JSObject();
    });}
    @PluginMethod public void open(PluginCall call){long generation=OutboxFiles.generation(getContext());run(call,()->{
        String uid=owner(call);reading=OutboxFiles.mediaRead(getContext(),uid,call.getString("id"),generation);readingOwner=uid;readingGeneration=generation;
        JSObject result=new JSObject();result.put("bytes",reading.media.length);return result;
    });}
    @PluginMethod public void chunk(PluginCall call){run(call,()->{
        String uid=owner(call);int offset=call.getInt("offset",-1);
        if(reading==null||!uid.equals(readingOwner)||readingGeneration!=OutboxFiles.generation(getContext())||offset<0||offset>reading.media.length)throw new Exception("INVALID_PENDING_MEDIA");
        JSObject result=new JSObject();result.put("base64",Base64.encodeToString(Arrays.copyOfRange(reading.media,offset,Math.min(reading.media.length,offset+196608)),Base64.NO_WRAP));return result;
    });}
    @PluginMethod public void close(PluginCall call){run(call,()->{owner(call);reset();return new JSObject();});}
    @PluginMethod public void clearAll(PluginCall call){run(call,()->{reset();OutboxFiles.clearAll(getContext());return new JSObject();});}
    @Override protected void handleOnPause(){synchronized(TrackerAuth.class){reset();}super.handleOnPause();}
}
