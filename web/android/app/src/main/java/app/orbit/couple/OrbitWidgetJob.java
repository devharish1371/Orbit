package app.orbit.couple;
import android.app.job.*;
import java.util.concurrent.*;
/** Network work is outside the widget broadcast's execution budget. */
public class OrbitWidgetJob extends JobService {
    private final ExecutorService executor=Executors.newSingleThreadExecutor();private volatile Object active;
    @Override public boolean onStartJob(JobParameters params){Object run=new Object();active=run;executor.execute(()->{try{WidgetEngine.refresh(this,()->active==run&&!Thread.currentThread().isInterrupted());}finally{if(active==run){OrbitWidgetProvider.renderAll(this);jobFinished(params,false);}}});return true;}
    @Override public boolean onStopJob(JobParameters params){active=null;return false;}
    @Override public void onDestroy(){active=null;executor.shutdownNow();super.onDestroy();}
}
