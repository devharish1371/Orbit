package app.orbit.couple;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** No-backup encrypted files, serialized with clear/write generations. No auth-lock calls here. */
final class OutboxFiles {
    private static long epoch;
    private static boolean initialized;
    private static final String PREFIX = "OrbitOutboxV1_";
    static synchronized long generation(Context context) {
        if (!initialized) { epoch = context.getSharedPreferences("OrbitOutbox",0).getLong("generation",0); initialized=true; }
        return epoch;
    }
    private static void check(long expected) throws Exception { if (epoch != expected) throw new Exception("OUTBOX_CLEARED"); }
    static String uuid(String value) throws Exception {
        if (value == null || !UUID.fromString(value).toString().equals(value)) throw new Exception("INVALID_OUTBOX_ID");
        return value;
    }
    private static File root(Context context) throws Exception {
        File dir = new File(context.getNoBackupFilesDir(), "orbit-outbox");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("OUTBOX_STORAGE_FAILED");
        return dir;
    }
    private static SecretKey key(String owner) throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        String alias = PREFIX + uuid(owner) + "_" + epoch;
        if (!store.containsAlias(alias)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
            generator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry)store.getEntry(alias, null)).getSecretKey();
    }
    private static Set<String> names(File dir, String owner) {
        Set<String> names = new HashSet<>(); File[] files = dir.listFiles();
        if (files != null) for (File f : files) if (f.getName().startsWith(owner + "_") && (f.getName().endsWith(".box") || f.getName().endsWith(".box.bak")))
            names.add(f.getName().replaceFirst("\\.bak$", ""));
        return names;
    }
    static synchronized void put(Context context, String owner, String id, String value, long expected) throws Exception {
        check(expected); uuid(owner); uuid(id);
        File dir = root(context), file = new File(dir, owner + "_" + id + ".box");
        if (!file.exists() && names(dir, owner).size() >= 50) throw new Exception("OUTBOX_FULL");
        byte[] encrypted = OutboxCipher.encrypt(value.getBytes(StandardCharsets.UTF_8), key(owner), owner + ":" + id);
        AtomicFile atomic = new AtomicFile(file); FileOutputStream stream = null;
        try { stream = atomic.startWrite(); stream.write(encrypted); atomic.finishWrite(stream); }
        catch (Exception failure) { if (stream != null) atomic.failWrite(stream); throw failure; }
    }
    static synchronized List<String> list(Context context, String owner, long expected) throws Exception {
        check(expected); uuid(owner); File dir = root(context); List<String> result = new ArrayList<>();
        for (String name : names(dir, owner)) {
            String id = name.substring(owner.length() + 1, name.length() - 4); uuid(id);
            AtomicFile file = new AtomicFile(new File(dir, name));
            try { result.add(new String(OutboxCipher.decrypt(file.readFully(), key(owner), owner + ":" + id), StandardCharsets.UTF_8)); }
            catch (Exception invalid) { file.delete(); }
        }
        return result;
    }
    static synchronized void remove(Context context, String owner, String id, long expected) throws Exception {
        check(expected); new AtomicFile(new File(root(context), uuid(owner) + "_" + uuid(id) + ".box")).delete();
    }
    static synchronized void clearAll(Context context) {
        generation(context); epoch++;
        context.getSharedPreferences("OrbitOutbox",0).edit().putLong("generation",epoch).commit();
        try { File[] files = root(context).listFiles(); if (files != null) for (File file : files) file.delete(); } catch (Exception ignored) {}
        try {
            KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
            var aliases = store.aliases(); List<String> remove = new ArrayList<>();
            while (aliases.hasMoreElements()) { String alias = aliases.nextElement(); if (alias.startsWith(PREFIX)) remove.add(alias); }
            for (String alias : remove) store.deleteEntry(alias);
        } catch (Exception ignored) {}
    }
    private OutboxFiles() {}
}
