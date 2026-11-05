package app.orbit.couple;
import java.io.*;
import java.text.*;
import java.util.*;
/** Small encrypted snapshot, never a URL/token or a backup. Pure bounded codec. */
final class WidgetSnapshot {
    static final int MAX_IMAGE=96*1024;static final long MAX_AGE=30*60*1000L;
    final String owner,couple,kind,id,title,when;final long revision,checkedAt,startsAt;final byte[] image;
    WidgetSnapshot(String owner,String couple,String kind,String id,long revision,long checkedAt,long startsAt,String title,String when,byte[] image)throws Exception{
        for(String value:new String[]{owner,couple,id})if(value==null||!UUID.fromString(value).toString().equals(value))throw new Exception("WIDGET_INVALID");
        if(!("photo".equals(kind)||"plan".equals(kind))||revision<1||checkedAt<1||startsAt<0||title==null||when==null||title.length()>120||when.length()>160||image==null||image.length>MAX_IMAGE||("photo".equals(kind)?image.length==0:image.length!=0))throw new Exception("WIDGET_INVALID");
        this.owner=owner;this.couple=couple;this.kind=kind;this.id=id;this.revision=revision;this.checkedAt=checkedAt;this.startsAt=startsAt;this.title=title;this.when=when;this.image=image.clone();
    }
    boolean matches(String owner,String couple,String id,String kind,long revision){return this.owner.equals(owner)&&this.couple.equals(couple)&&this.id.equals(id)&&this.kind.equals(kind)&&this.revision==revision;}
    boolean visible(String currentOwner,boolean privacy,boolean keyguard,boolean verified,long now){return owner.equals(currentOwner)&&!privacy&&!keyguard&&verified&&now>=checkedAt&&now-checkedAt<=MAX_AGE&&(!kind.equals("plan")||startsAt>now);}
    byte[] pack()throws Exception{ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(DataOutputStream out=new DataOutputStream(bytes)){out.writeInt(1);for(String value:new String[]{owner,couple,kind,id,title,when})out.writeUTF(value);out.writeLong(revision);out.writeLong(checkedAt);out.writeLong(startsAt);out.writeInt(image.length);out.write(image);}return bytes.toByteArray();}
    static WidgetSnapshot unpack(byte[] value)throws Exception{
        if(value.length>MAX_IMAGE+4096)throw new Exception("WIDGET_INVALID");try(DataInputStream in=new DataInputStream(new ByteArrayInputStream(value))){if(in.readInt()!=1)throw new Exception("WIDGET_INVALID");String owner=in.readUTF(),couple=in.readUTF(),kind=in.readUTF(),id=in.readUTF(),title=in.readUTF(),when=in.readUTF();long version=in.readLong(),checked=in.readLong(),starts=in.readLong();int n=in.readInt();if(n<0||n>MAX_IMAGE||n!=in.available())throw new Exception("WIDGET_INVALID");byte[] image=new byte[n];in.readFully(image);return new WidgetSnapshot(owner,couple,kind,id,version,checked,starts,title,when,image);}
    }
    static long instant(String raw)throws Exception{if(raw==null||!raw.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,6})?(Z|[+-]\\d{2}:\\d{2})"))throw new Exception("WIDGET_INVALID");String value=raw.replaceFirst("\\.\\d+(?=Z|[+-])","");SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX",Locale.ROOT);f.setLenient(false);ParsePosition p=new ParsePosition(0);Date d=f.parse(value,p);if(d==null||p.getIndex()!=value.length())throw new Exception("WIDGET_INVALID");return d.getTime();}
}
