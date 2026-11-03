package app.orbit.couple;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name="OrbitOutbox")
public class OutboxPlugin extends Plugin {
    interface Work { JSObject run() throws Exception; }
    private void run(PluginCall call, Work work) {
        getBridge().execute(() -> { try { call.resolve(work.run()); } catch(Exception failure) { call.reject("OUTBOX_STORAGE_UNAVAILABLE"); } });
    }
    private String owner(PluginCall call) throws Exception {
        String expected = OutboxFiles.uuid(call.getString("owner")), raw = TrackerAuth.read(getContext());
        if (raw == null || !expected.equals(new JSONObject(raw).getJSONObject("user").getString("id"))) throw new Exception("OUTBOX_ACCOUNT_CHANGED");
        return expected;
    }
    @PluginMethod public void put(PluginCall call) {
        long generation = OutboxFiles.generation(getContext());
        run(call, () -> {
            String uid=owner(call), id=OutboxFiles.uuid(call.getString("id")), value=call.getString("value");
            JSONObject item=new JSONObject(value);
            if (!uid.equals(item.getString("owner")) || !id.equals(item.getString("id"))) throw new Exception("INVALID_OUTBOX_OWNER");
            OutboxFiles.put(getContext(),uid,id,value,generation); return new JSObject();
        });
    }
    @PluginMethod public void list(PluginCall call) {
        long generation=OutboxFiles.generation(getContext());
        run(call, () -> { JSObject result=new JSObject(); result.put("values",new JSArray(OutboxFiles.list(getContext(),owner(call),generation))); return result; });
    }
    @PluginMethod public void remove(PluginCall call) {
        long generation=OutboxFiles.generation(getContext());
        run(call, () -> { OutboxFiles.remove(getContext(),owner(call),call.getString("id"),generation); return new JSObject(); });
    }
    @PluginMethod public void clearAll(PluginCall call) { run(call, () -> { OutboxFiles.clearAll(getContext()); return new JSObject(); }); }
}
