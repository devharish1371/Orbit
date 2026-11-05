package app.orbit.couple;

/** Canonical post or post:photo identities; no filesystem separators are accepted. */
final class KeepsakeIds {
    private static final String UUID="[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}";
    static String valid(String id) throws Exception {
        if(id==null||!id.matches(UUID+"(:"+UUID+")?"))throw new Exception("INVALID_COPY_ID");
        return id;
    }
    static String filename(String id) throws Exception {return valid(id).replace(':','~');}
    static String fromFilename(String id) throws Exception {return valid(id.replace('~',':'));}
    private KeepsakeIds(){}
}
