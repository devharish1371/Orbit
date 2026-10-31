package app.orbit.couple;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ScrollView;

/** Native-only artwork: no account details or WebView content on the privacy cover. */
final class OrbitLockCover extends FrameLayout {
    private final Button unlock;
    private final TextView hint;
    OrbitLockCover(Context context, Runnable authenticate) {
        super(context);
        setBackgroundColor(Color.rgb(16,19,30)); setClickable(true); setFocusable(true);
        LinearLayout stack = new LinearLayout(context);
        stack.setOrientation(LinearLayout.VERTICAL); stack.setGravity(Gravity.CENTER);
        stack.setPadding(dp(28),dp(40),dp(28),dp(40));
        stack.addView(new Seal(context),new LinearLayout.LayoutParams(dp(240),dp(180)));
        TextView title = new TextView(context);
        title.setText("Orbit"); title.setTextSize(36); title.setTextColor(Color.rgb(245,241,233));
        title.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL)); title.setLetterSpacing(-.04f); title.setGravity(Gravity.CENTER); stack.addView(title);
        hint = new TextView(context); hint.setTextSize(14); hint.setTextColor(Color.rgb(183,193,213));
        hint.setGravity(Gravity.CENTER); hint.setPadding(0,dp(12),0,dp(32)); stack.addView(hint);
        unlock = new Button(context); unlock.setAllCaps(false); unlock.setTextSize(15);
        unlock.setTextColor(Color.rgb(16,19,30)); unlock.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
        GradientDrawable shape = new GradientDrawable(); shape.setColor(Color.rgb(255,207,183)); shape.setCornerRadius(dp(28));
        unlock.setBackground(shape); unlock.setMinHeight(dp(54)); unlock.setPadding(dp(24),0,dp(24),0);
        unlock.setOnClickListener(view -> authenticate.run()); stack.addView(unlock,new LinearLayout.LayoutParams(dp(220),dp(54)));
        TextView method = new TextView(context); method.setText("Use your device fingerprint or screen lock");
        method.setTextSize(12); method.setTextColor(Color.rgb(183,193,213)); method.setGravity(Gravity.CENTER); method.setPadding(0,dp(20),0,0); stack.addView(method);
        ScrollView scroll = new ScrollView(context); scroll.setFillViewport(true); scroll.setClipToPadding(false);
        scroll.addView(stack,new ScrollView.LayoutParams(-1,-2));
        addView(scroll,new FrameLayout.LayoutParams(-1,-1)); update(false);
    }
    void update(boolean checking) {
        unlock.setEnabled(!checking); unlock.setAlpha(checking ? .65f : 1f);
        unlock.setText(checking ? "Checking…" : "Unlock Orbit");
        hint.setText(checking ? "Confirm with your device" : "Your space is locked");
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private final class Seal extends View {
        final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Seal(Context context) { super(context); setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO); }
        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas); canvas.save(); canvas.translate(getWidth()/2f,getHeight()/2f); canvas.scale(getWidth()/240f,getHeight()/180f);
            paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.3f); paint.setColor(Color.rgb(120,132,166));
            canvas.save(); canvas.rotate(-25); canvas.drawOval(new RectF(-100,-47,100,47),paint); canvas.restore();
            paint.setStrokeWidth(.8f); paint.setColor(Color.rgb(55,65,90)); canvas.save(); canvas.rotate(25); canvas.drawOval(new RectF(-100,-47,100,47),paint); canvas.restore();
            paint.setStyle(Paint.Style.FILL); paint.setColor(Color.rgb(255,155,125)); canvas.drawCircle(-87,41,10,paint);
            paint.setColor(Color.rgb(166,184,255)); canvas.drawCircle(87,-41,10,paint);
            paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.8f); paint.setColor(Color.rgb(216,222,239));
            canvas.drawRoundRect(new RectF(-11,-1,11,17),5,5,paint); canvas.drawArc(new RectF(-7,-13,7,4),180,180,false,paint);
            paint.setStyle(Paint.Style.FILL); canvas.drawCircle(0,7,1.6f,paint); canvas.restore();
        }
    }
}
