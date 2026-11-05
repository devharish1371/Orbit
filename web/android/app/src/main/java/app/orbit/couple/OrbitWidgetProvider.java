package app.orbit.couple;
import android.app.*;
import android.app.job.*;
import android.appwidget.*;
import android.content.*;
import android.graphics.*;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
/** Full updates always replace every personal view, including transitions back to covered. */
public class OrbitWidgetProvider extends AppWidgetProvider {
    static final int JOB=137128;
    static int[] ids(Context c){return AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,OrbitWidgetProvider.class));}
    static void coverAll(Context c){for(int id:ids(c))render(c,id,true);}
    static void renderAll(Context c){for(int id:ids(c))render(c,id,false);}
    static void refresh(Context c){renderAll(c);if(ids(c).length==0||WidgetEngine.privateMode(c)||WidgetStore.prefs(c).getString("owner","").isEmpty())return;JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);if(scheduler!=null)scheduler.schedule(new JobInfo.Builder(JOB,new ComponentName(c,OrbitWidgetJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(0).build());}
    static void render(Context c,int id,boolean forceCover){
        OrbitPalette p=OrbitAppearance.palette(c);RemoteViews views=new RemoteViews(c.getPackageName(),R.layout.orbit_widget);views.setInt(R.id.widget_surface,"setBackgroundResource",p.light?R.drawable.widget_day:R.drawable.widget_night);
        views.setInt(R.id.widget_photo,"setBackgroundResource",p.light?R.drawable.widget_day:R.drawable.widget_night);views.setViewVisibility(R.id.widget_photo,View.GONE);views.setImageViewBitmap(R.id.widget_photo,null);views.setTextViewText(R.id.widget_title,"Orbit");views.setTextViewText(R.id.widget_detail,"Open Orbit");views.setTextViewText(R.id.widget_updated,"");views.setTextColor(R.id.widget_title,p.text);views.setTextColor(R.id.widget_detail,p.muted);views.setTextColor(R.id.widget_updated,p.muted);
        float scale=OrbitAppearance.scale(c);views.setTextViewTextSize(R.id.widget_title,TypedValue.COMPLEX_UNIT_SP,17*scale);views.setTextViewTextSize(R.id.widget_detail,TypedValue.COMPLEX_UNIT_SP,12*scale);views.setTextViewTextSize(R.id.widget_updated,TypedValue.COMPLEX_UNIT_SP,10*scale);
        var manager=AppWidgetManager.getInstance(c);Bundle options=manager.getAppWidgetOptions(id);boolean compact=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,140)<130||c.getResources().getConfiguration().fontScale>1.5f;
        String kind="private";WidgetSnapshot item=null;try{var auth=c.getSharedPreferences("OrbitAuth",0);String owner=auth.getString("owner","");KeyguardManager guard=(KeyguardManager)c.getSystemService(Context.KEYGUARD_SERVICE);boolean keyguard=guard==null||guard.isKeyguardLocked()||options.getInt(AppWidgetManager.OPTION_APPWIDGET_HOST_CATEGORY,1)!=AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN;
            if(!forceCover&&!compact&&auth.getString("session",null)!=null){WidgetSnapshot snapshot=WidgetStore.read(c);if(snapshot.visible(owner,WidgetEngine.privateMode(c),keyguard,WidgetStore.prefs(c).getBoolean("verified",false),System.currentTimeMillis()))item=snapshot;}
        }catch(Exception ignored){}
        if(item!=null){kind=item.kind;views.setTextViewText(R.id.widget_title,item.title);views.setTextViewText(R.id.widget_detail,item.when);views.setTextViewText(R.id.widget_updated,"Updated "+android.text.format.DateFormat.getTimeFormat(c).format(new java.util.Date(item.checkedAt)));if(kind.equals("photo")){Bitmap image=BitmapFactory.decodeByteArray(item.image,0,item.image.length);if(image!=null){views.setImageViewBitmap(R.id.widget_photo,image);views.setViewVisibility(R.id.widget_photo,View.VISIBLE);}else{kind="private";views.setTextViewText(R.id.widget_title,"Orbit");views.setTextViewText(R.id.widget_detail,"Open Orbit");views.setTextViewText(R.id.widget_updated,"");}}}
        views.setViewVisibility(R.id.widget_seal,kind.equals("private")?View.VISIBLE:View.GONE);views.setViewVisibility(R.id.widget_detail,(compact||kind.equals("photo"))?View.GONE:View.VISIBLE);views.setViewVisibility(R.id.widget_updated,compact?View.GONE:View.VISIBLE);views.setViewVisibility(R.id.widget_title,(compact||kind.equals("photo"))?View.GONE:View.VISIBLE);
        Intent open=new Intent(c,MainActivity.class).setData(android.net.Uri.parse("orbit://widget/"+id)).putExtra("orbit_widget",kind).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending=PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);views.setOnClickPendingIntent(R.id.widget_surface,pending);views.setContentDescription(R.id.widget_surface,kind.equals("private")?"Open Orbit":kind.equals("photo")?"Open photo keepsakes":"Open plan: "+item.title);manager.updateAppWidget(id,views);
    }
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){refresh(c);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager manager,int id,Bundle options){render(c,id,false);}
    @Override public void onDisabled(Context c){WidgetStore.clear(c);JobScheduler jobs=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);if(jobs!=null)jobs.cancel(JOB);}
}
