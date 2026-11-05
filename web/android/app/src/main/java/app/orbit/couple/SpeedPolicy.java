package app.orbit.couple;
/** Device-speed heuristic, never a driver or road-limit classifier. All times are monotonic. */
final class SpeedPolicy {
    private long start=-1,previous=-1,lastPrompt=-1;private int count;private boolean armed=true;
    void reset(){start=-1;previous=-1;count=0;}
    boolean accept(long now,long sample,double speed,double uncertainty,double horizontal,int threshold,boolean live,boolean mocked){
        if(!live||mocked||sample<0||sample>now||now-sample>10000||!Double.isFinite(speed)||!Double.isFinite(uncertainty)||!Double.isFinite(horizontal)||speed<0||speed>70||uncertainty<0||uncertainty>3||horizontal<=0||horizontal>50){reset();return false;}
        if(previous>=0&&sample<=previous)return false;
        if(previous>=0&&sample-previous>20000)reset();
        previous=sample;
        if(lastPrompt>=0&&now<lastPrompt){lastPrompt=now;armed=false;reset();return false;}
        double limit=threshold/3.6;
        if(speed+2*uncertainty<limit-5/3.6){armed=true;start=-1;count=0;return false;}
        if(speed-2*uncertainty<=limit){start=-1;count=0;return false;}
        if(!armed||(lastPrompt>=0&&now-lastPrompt<900000)){start=-1;count=0;return false;}
        if(start<0)start=sample;count++;
        if(count>=4&&sample-start>=45000){lastPrompt=now;armed=false;reset();return true;}
        return false;
    }
}
