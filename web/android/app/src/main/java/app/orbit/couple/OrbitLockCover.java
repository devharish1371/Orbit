package app.orbit.couple;
import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.widget.*;
/** Native artwork only. Never reads an account, photo or personal text. */
final class OrbitLockCover extends FrameLayout {
    private final Button action; private final TextView title,hint; private final Seal seal;
    private boolean locked,checking,stalled;
    OrbitLockCover(Context context,Runnable authenticate,Runnable reload){
        super(context);setClickable(true);setFocusable(true);setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        LinearLayout stack=new LinearLayout(context);stack.setOrientation(LinearLayout.VERTICAL);stack.setGravity(Gravity.CENTER);stack.setPadding(dp(28),dp(40),dp(28),dp(40));
        seal=new Seal(context);stack.addView(seal,new LinearLayout.LayoutParams(dp(200),dp(145)));
        title=new TextView(context);title.setText("Orbit");title.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));title.setLetterSpacing(-.04f);title.setGravity(Gravity.CENTER);stack.addView(title);
        hint=new TextView(context);hint.setGravity(Gravity.CENTER);hint.setPadding(0,dp(12),0,dp(24));stack.addView(hint);
        action=new Button(context);action.setAllCaps(false);action.setMinHeight(dp(54));action.setPadding(dp(24),dp(12),dp(24),dp(12));action.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));action.setOnClickListener(v->{if(locked)authenticate.run();else reload.run();});stack.addView(action,new LinearLayout.LayoutParams(dp(220),-2));
        ScrollView scroll=new ScrollView(context);scroll.setFillViewport(true);scroll.addView(stack,new ScrollView.LayoutParams(-1,-2));addView(scroll,new FrameLayout.LayoutParams(-1,-1));
        try{Typeface font=androidx.core.content.res.ResourcesCompat.getFont(context,R.font.orbit_sans);if(font!=null){title.setTypeface(android.os.Build.VERSION.SDK_INT>=28?Typeface.create(font,650,false):Typeface.create(font,Typeface.BOLD));hint.setTypeface(font);action.setTypeface(android.os.Build.VERSION.SDK_INT>=28?Typeface.create(font,600,false):Typeface.create(font,Typeface.BOLD));}}catch(Exception ignored){}
        update(false,false,false);
    }
    void update(boolean locked,boolean checking,boolean stalled){
        this.locked=locked;this.checking=checking;this.stalled=stalled;OrbitPalette p=OrbitAppearance.palette(getContext());float scale=OrbitAppearance.scale(getContext());
        android.app.KeyguardManager guard=(android.app.KeyguardManager)getContext().getSystemService(Context.KEYGUARD_SERVICE);boolean available=guard!=null&&guard.isDeviceSecure();
        setBackgroundColor(p.background);title.setTextColor(p.text);title.setTextSize(34*scale);hint.setTextColor(p.muted);hint.setTextSize(14*scale);
        hint.setText(checking?"Confirm with your device":locked?(available?"Locked":"Set up your device screen lock"):stalled?"Still opening":"");hint.setVisibility(locked||stalled||checking?VISIBLE:GONE);
        action.setVisibility(locked||stalled?VISIBLE:GONE);action.setEnabled(!checking);action.setAlpha(checking?.65f:1);action.setText(locked?(checking?"Checking…":available?"Unlock Orbit":"Device security"):"Reload");action.setTextSize(15*scale);action.setTextColor(p.buttonText);
        GradientDrawable shape=new GradientDrawable();shape.setColor(p.button);shape.setCornerRadius(dp(30));action.setBackground(shape);seal.invalidate();
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private final class Seal extends View {
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        Seal(Context c){super(c);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);OrbitPalette p=OrbitAppearance.palette(getContext());canvas.save();canvas.translate(getWidth()/2f,getHeight()/2f);float s=Math.min(getWidth()/200f,getHeight()/145f);canvas.scale(s,s);
            paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1);paint.setColor(p.line);canvas.save();canvas.rotate(-24);canvas.drawOval(new RectF(-87,-32,87,32),paint);canvas.restore();paint.setAlpha(90);canvas.save();canvas.rotate(24);canvas.drawOval(new RectF(-87,-32,87,32),paint);canvas.restore();paint.setAlpha(255);
            paint.setStyle(Paint.Style.FILL);paint.setColor(p.accent);canvas.drawCircle(-73,33,7,paint);paint.setColor(p.second);canvas.drawCircle(73,-33,7,paint);
            if(locked){paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1.6f);paint.setColor(p.text);canvas.drawRoundRect(new RectF(-9,-1,9,14),4,4,paint);canvas.drawArc(new RectF(-6,-12,6,2),180,180,false,paint);paint.setStyle(Paint.Style.FILL);canvas.drawCircle(0,5,1.3f,paint);}canvas.restore();
        }
    }
}
