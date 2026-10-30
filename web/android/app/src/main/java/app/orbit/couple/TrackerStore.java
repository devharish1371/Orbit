package app.orbit.couple;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/** Private bounded durable queue. Never logged or included in Android backup. */
final class TrackerStore extends SQLiteOpenHelper {
    record Item(long id,String kind,JSONObject value){}
    TrackerStore(Context c){super(c,"orbit-tracker.db",null,1);}
    @Override public void onCreate(SQLiteDatabase db){db.execSQL("create table pending(id integer primary key autoincrement,kind text not null,value text not null)");}
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){}
    synchronized void add(String kind,JSONObject value){
        getWritableDatabase().execSQL("insert into pending(kind,value) values(?,?)",new Object[]{kind,value.toString()});
        getWritableDatabase().execSQL("delete from pending where id not in(select id from pending order by id desc limit 500)");
    }
    synchronized List<Item> batch() throws Exception {
        List<Item> items=new ArrayList<>();try(var cursor=getReadableDatabase().rawQuery("select id,kind,value from pending order by id limit 100",null)){
            while(cursor.moveToNext())items.add(new Item(cursor.getLong(0),cursor.getString(1),new JSONObject(cursor.getString(2))));
        }return items;
    }
    synchronized void acknowledge(List<Item> items){var db=getWritableDatabase();db.beginTransaction();try{for(Item item:items)db.delete("pending","id=?",new String[]{Long.toString(item.id)});db.setTransactionSuccessful();}finally{db.endTransaction();}}
    synchronized void clear(){getWritableDatabase().delete("pending",null,null);}
    synchronized int count(){try(var cursor=getReadableDatabase().rawQuery("select count(*) from pending",null)){cursor.moveToFirst();return cursor.getInt(0);}}
    static synchronized void log(Context c,String code){
        try{var prefs=c.getSharedPreferences("OrbitTracking",0);JSONArray old=new JSONArray(prefs.getString("diagnostics","[]")),next=new JSONArray();
            for(int i=Math.max(0,old.length()-199);i<old.length();i++)next.put(old.get(i));
            next.put(new JSONObject().put("at",System.currentTimeMillis()).put("code",code));prefs.edit().putString("diagnostics",next.toString()).apply();
        }catch(Exception ignored){}
    }
}
