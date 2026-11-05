package app.orbit.couple;
final class EntrancePolicy {
    static boolean covered(boolean ready,boolean locked,boolean checking,boolean lockEnabled,boolean foreground){return !ready||locked||checking||(lockEnabled&&!foreground);}
    static boolean accept(String expected,String received){return expected!=null&&expected.equals(received);}
    static boolean elapsed(long backgroundAt,long now){return backgroundAt>=0&&now-backgroundAt>=60000;}
}
