package app.orbit.couple;
import android.content.Context;
import android.content.res.Configuration;
final class OrbitAppearance {
    static boolean light(Context c){String mode=c.getSharedPreferences("OrbitAppearance",0).getString("theme","system");return mode.equals("light")||(!mode.equals("dark")&&(c.getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)!=Configuration.UI_MODE_NIGHT_YES);}
    static OrbitPalette palette(Context c){return new OrbitPalette(light(c),c.getSharedPreferences("OrbitAppearance",0).getString("accent","#FF6B8A"));}
    static float scale(Context c){return switch(c.getSharedPreferences("OrbitAppearance",0).getString("text","standard")){case "largest"->1.25f;case "larger"->1.125f;default->1f;};}
    static boolean reduced(Context c){return c.getSharedPreferences("OrbitAppearance",0).getBoolean("reduced",false);}
    static int launchTheme(Context c){return light(c)?R.style.AppTheme_OrbitDayLaunch:R.style.AppTheme_OrbitNightLaunch;}
    static void save(Context c,String theme,String accent,String text,boolean reduced)throws Exception{
        if(!java.util.Arrays.asList("light","dark","system").contains(theme)||accent==null||!accent.matches("#[0-9a-fA-F]{6}")||!java.util.Arrays.asList("standard","larger","largest").contains(text))throw new Exception("INVALID_APPEARANCE");
        var previous=c.getSharedPreferences("OrbitAppearance",0);if(theme.equals(previous.getString("theme","system"))&&accent.equals(previous.getString("accent","#FF6B8A"))&&text.equals(previous.getString("text","standard"))&&reduced==previous.getBoolean("reduced",false))return;
        if(!c.getSharedPreferences("OrbitAppearance",0).edit().putString("theme",theme).putString("accent",accent).putString("text",text).putBoolean("reduced",reduced).commit())throw new Exception("APPEARANCE_UNAVAILABLE");
    }
}
