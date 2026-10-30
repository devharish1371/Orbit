package app.orbit.couple;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** One native refresh owner shared by the service and the Supabase JS fetch adapter. */
final class TrackerAuth {
    record Reply(int status,String body) {JSONObject json() throws Exception{return new JSONObject(body);}}
    private static SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias("OrbitSessionV1")){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder("OrbitSessionV1",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
            generator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry)store.getEntry("OrbitSessionV1",null)).getSecretKey();
    }
    static synchronized void save(Context c,String value) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        String encoded=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
        if(!c.getSharedPreferences("OrbitAuth",0).edit().putString("session",encoded).commit())throw new Exception("AUTH_STORAGE_FAILED");
    }
    static synchronized String read(Context c) throws Exception {
        String encoded=c.getSharedPreferences("OrbitAuth",0).getString("session",null);if(encoded==null)return null;
        String[] parts=encoded.split(":");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);
    }
    static synchronized void clear(Context c){c.getSharedPreferences("OrbitAuth",0).edit().clear().commit();}
    static void configure(Context c,String url,String apiKey) throws Exception {
        URL parsed=new URL(url);if(!parsed.getProtocol().equals("https")||!parsed.getHost().endsWith(".supabase.co")||!parsed.getPath().isEmpty())throw new Exception("INVALID_PROJECT_URL");
        c.getSharedPreferences("OrbitTracking",0).edit().putString("url",url).putString("publicKey",apiKey).commit();
    }
    private static String readBody(java.io.InputStream stream) throws Exception {
        java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[4096];int count;
        while((count=stream.read(buffer))!=-1){out.write(buffer,0,count);if(out.size()>2_000_000)throw new Exception("RESPONSE_TOO_LARGE");}
        return out.toString("UTF-8");
    }
    private static Reply http(Context c,String method,String path,String token,JSONObject body) throws Exception {
        var prefs=c.getSharedPreferences("OrbitTracking",0);
        String base=prefs.getString("url","");if(base.isEmpty())throw new Exception("PROJECT_NOT_CONFIGURED");
        HttpURLConnection connection=(HttpURLConnection)new URL(base+path).openConnection();
        try{
            connection.setConnectTimeout(12000);connection.setReadTimeout(15000);connection.setRequestMethod(method);
            connection.setInstanceFollowRedirects(false);connection.setRequestProperty("apikey",prefs.getString("publicKey",""));
            connection.setRequestProperty("Content-Type","application/json");
            if(token!=null)connection.setRequestProperty("Authorization","Bearer "+token);
            if(body!=null){connection.setDoOutput(true);try(var out=connection.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}}
            int status=connection.getResponseCode();var stream=status>=400?connection.getErrorStream():connection.getInputStream();
            String result=stream==null?"{}":readBody(stream);
            if(stream!=null)stream.close();return new Reply(status,result.isEmpty()?"{}":result);
        }finally{connection.disconnect();}
    }
    static synchronized Reply refresh(Context c,boolean force) throws Exception {
        String raw=read(c);if(raw==null)return new Reply(401,"{\"error_code\":\"session_not_found\"}");
        JSONObject current=new JSONObject(raw);
        if(!force&&current.optLong("expires_at")>System.currentTimeMillis()/1000+120)return new Reply(200,raw);
        Reply reply=http(c,"POST","/auth/v1/token?grant_type=refresh_token",null,new JSONObject().put("refresh_token",current.getString("refresh_token")));
        if(reply.status==200){JSONObject next=reply.json();if(!next.has("expires_at"))next.put("expires_at",System.currentTimeMillis()/1000+next.getLong("expires_in"));save(c,next.toString());}
        if(reply.status==400||reply.status==401||reply.status==403){clear(c);TrackerStore.log(c,"auth_required");}
        return reply;
    }
    static synchronized void syncMode(Context c) throws Exception {
        var prefs=c.getSharedPreferences("OrbitTracking",0);String pending=prefs.getString("pendingMode",null);if(pending==null)return;
        String raw=read(c);if(raw==null)throw new Exception("AUTH_REQUIRED");
        String uid=new JSONObject(raw).getJSONObject("user").getString("id");
        Reply reply=request(c,"PATCH","/rest/v1/members?user_id=eq."+uid,new JSONObject(pending));
        if(reply.status<200||reply.status>=300)throw new Exception("MODE_PENDING");
        if(pending.equals(prefs.getString("pendingMode",null)))prefs.edit().remove("pendingMode").commit();
    }
    static synchronized Reply requestAs(Context c,String uid,String method,String path,JSONObject body) throws Exception {
        String raw=read(c);
        if(raw==null||!uid.equals(new JSONObject(raw).getJSONObject("user").getString("id")))return new Reply(401,"{\"error_code\":\"account_changed\"}");
        return request(c,method,path,body);
    }
    static synchronized Reply request(Context c,String method,String path,JSONObject body) throws Exception {
        Reply session=refresh(c,false);if(session.status!=200)return session;
        return http(c,method,path,session.json().getString("access_token"),body);
    }
    private TrackerAuth(){}
}
