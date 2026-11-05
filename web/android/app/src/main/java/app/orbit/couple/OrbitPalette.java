package app.orbit.couple;
/** Non-personal colors shared by launch, privacy cover and widget. Pure for JVM checks. */
final class OrbitPalette {
    final boolean light; final int background,text,muted,line,accent,second,button,buttonText;
    OrbitPalette(boolean light,String color) {
        this.light=light;background=hex(light?"#F5F2EA":"#10131E");text=hex(light?"#202431":"#F5F1E9");muted=hex(light?"#595F6F":"#B7C1D5");line=hex(light?"#858B9A":"#7884A6");
        int chosen=hex(color!=null&&color.matches("#[0-9a-fA-F]{6}")?color:"#FF6B8A");
        accent=readable(chosen,background,light);second=hex(light?"#6253AE":"#A6B8FF");button=mix(chosen,hex("#FFFFFF"),.65);buttonText=hex("#202431");
    }
    static int hex(String value){return (int)(0xff000000L|Long.parseLong(value.substring(1),16));}
    static int mix(int a,int b,double weight){int result=0xff000000;for(int shift:new int[]{16,8,0})result|=((int)Math.round(((a>>shift)&255)*(1-weight)+((b>>shift)&255)*weight))<<shift;return result;}
    static double luminance(int value){double[] w={.2126,.7152,.0722};double total=0;int i=0;for(int shift:new int[]{16,8,0}){double c=((value>>shift)&255)/255.;total+=w[i++]*(c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));}return total;}
    static double contrast(int a,int b){double x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
    static int readable(int color,int bg,boolean light){for(int i=0;i<40&&contrast(color,bg)<4.8;i++)color=mix(color,light?hex("#111111"):hex("#FFFFFF"),.12);return color;}
}
