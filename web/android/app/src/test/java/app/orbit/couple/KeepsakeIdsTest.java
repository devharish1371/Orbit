package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
public class KeepsakeIdsTest {
    private final String post="11111111-1111-4111-8111-111111111111",photo="22222222-2222-4222-8222-222222222222";
    @Test public void coverIdentityIsUnchangedAndExtraIdentityRoundTrips()throws Exception{
        assertEquals(post,KeepsakeIds.filename(post));
        assertEquals(post+"~"+photo,KeepsakeIds.filename(post+":"+photo));
        assertEquals(post+":"+photo,KeepsakeIds.fromFilename(post+"~"+photo));
    }
    @Test public void filenamesCannotEscapeOrAliasAnotherCopy(){
        for(String id:new String[]{"../"+post,post+"/"+photo,post+"~"+photo,post+":"+photo+":"+post,"AAAAAAAA-1111-4111-8111-111111111111","",post+".keep"}){
            assertThrows(Exception.class,()->KeepsakeIds.valid(id));
        }
    }
}
