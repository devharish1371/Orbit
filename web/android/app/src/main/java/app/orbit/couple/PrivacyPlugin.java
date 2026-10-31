package app.orbit.couple;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.CancellationSignal;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "OrbitPrivacy")
public class PrivacyPlugin extends Plugin {
    private Runnable success;
    private Runnable failure;
    private CancellationSignal authentication;
    private OutputStream output;
    private Uri destination;
    private long written;
    private boolean choosing;
    private PrivacyGuard guard() { return ((MainActivity)getActivity()).privacy; }
    @Override public void load() {
        // Bridge loads plugins inside Activity.onCreate; wait for its native guard.
        getActivity().getWindow().getDecorView().post(() -> guard().requestUnlock = () -> authenticate(null, () -> {}, () -> {}));
    }
    private JSObject state() {
        JSObject value = new JSObject(); PrivacyGuard guard = guard();
        value.put("enabled",guard.enabled()); value.put("screenshots",guard.screenshots());
        value.put("locked",guard.locked); value.put("available",guard.available()); return value;
    }
    @PluginMethod public void status(PluginCall call) { getActivity().runOnUiThread(() -> call.resolve(state())); }
    @PluginMethod public void configure(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            boolean enabled = call.getBoolean("enabled",false), screenshots = call.getBoolean("screenshots",false);
            Runnable save = () -> { guard().configure(enabled,screenshots); call.resolve(state()); };
            if (enabled || guard().enabled()) authenticate(call,save,() -> call.reject("Authentication cancelled"));
            else save.run();
        });
    }
    @PluginMethod public void unlock(PluginCall call) {
        getActivity().runOnUiThread(() -> authenticate(call,() -> call.resolve(state()),() -> call.reject("Authentication cancelled")));
    }
    private void authenticate(PluginCall call, Runnable ok, Runnable cancelled) {
        PrivacyGuard guard = guard();
        if (guard.authenticating || !guard.available()) { if (call != null) call.reject("Set up a device screen lock first"); return; }
        guard.authenticating = true; guard.apply(); success = ok; failure = cancelled;
        if (Build.VERSION.SDK_INT >= 30) {
            authentication = new CancellationSignal();
            BiometricPrompt prompt = new BiometricPrompt.Builder(getContext()).setTitle("Unlock Orbit")
                .setSubtitle("Use your device screen lock or biometrics")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL).build();
            prompt.authenticate(authentication,getActivity().getMainExecutor(),new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) { finishAuthentication(true); }
                @Override public void onAuthenticationError(int code, CharSequence message) { finishAuthentication(false); }
            });
        } else {
            KeyguardManager manager = (KeyguardManager)getContext().getSystemService(Context.KEYGUARD_SERVICE);
            @SuppressWarnings("deprecation") Intent intent = manager.createConfirmDeviceCredentialIntent("Unlock Orbit","Confirm your device screen lock");
            if (intent == null || call == null) {
                // Native cover has no JS call to attach; launch through a retained plugin call.
                if (intent != null) { getActivity().startActivityForResult(intent,7821); return; }
                finishAuthentication(false); return;
            }
            startActivityForResult(call,intent,"credentialResult");
        }
    }
    @ActivityCallback private void credentialResult(PluginCall call, ActivityResult result) { finishAuthentication(result.getResultCode() == Activity.RESULT_OK); }
    void legacyCredentialResult(boolean ok) { finishAuthentication(ok); }
    private void finishAuthentication(boolean ok) {
        Runnable callback = ok ? success : failure; success = null; failure = null; authentication = null;
        guard().authenticating = false;
        if (ok) guard().authenticated(); else guard().apply();
        if (callback != null) callback.run();
        notifyListeners("locked",state());
    }
    @PluginMethod public synchronized void beginExport(PluginCall call) {
        if (choosing || output != null) { call.reject("Export already running"); return; }
        String filename = call.getString("filename","");
        if (!filename.matches("orbit-memories-[0-9-]{10}\\.zip")) { call.reject("Invalid export filename"); return; }
        choosing = true;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/zip").putExtra(Intent.EXTRA_TITLE,filename);
        startActivityForResult(call,intent,"exportDestination");
    }
    @ActivityCallback private synchronized void exportDestination(PluginCall call, ActivityResult result) {
        choosing = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(new JSObject().put("cancelled",true)); return; }
        try {
            destination = result.getData().getData(); written = 0;
            output = getContext().getContentResolver().openOutputStream(destination,"wt");
            if (output == null) throw new IllegalStateException();
            call.resolve(new JSObject().put("cancelled",false));
        } catch (Exception error) { cleanup(); call.reject("Could not open export destination"); }
    }
    @PluginMethod public synchronized void appendExport(PluginCall call) {
        try {
            String chunk = call.getString("chunk","");
            if (output == null || chunk.length() > 360000) throw new IllegalStateException();
            byte[] bytes = Base64.decode(chunk,Base64.NO_WRAP); written += bytes.length;
            if (written > 410L*1024*1024) throw new IllegalStateException();
            output.write(bytes); call.resolve();
        } catch (Exception error) { cleanup(); call.reject("Could not write export"); }
    }
    @PluginMethod public synchronized void finishExport(PluginCall call) {
        try {
            if (output == null) throw new IllegalStateException();
            output.flush(); output.close(); output = null; destination = null; call.resolve();
        } catch (Exception error) { cleanup(); call.reject("Could not finish export"); }
    }
    @PluginMethod public synchronized void cancelExport(PluginCall call) { cleanup(); call.resolve(); }
    private void cleanup() {
        try { if (output != null) output.close(); } catch (Exception ignored) {}
        output = null;
        try { if (destination != null) DocumentsContract.deleteDocument(getContext().getContentResolver(),destination); } catch (Exception ignored) {}
        destination = null;
    }
    @Override protected synchronized void handleOnDestroy() {
        if (authentication != null) authentication.cancel();
        cleanup();
    }
}
