package app.orbit.couple;
import org.junit.Test;
import static org.junit.Assert.*;
public class PrivacyGuardTest {
    @Test public void locksAtOneMinuteUsingMonotonicElapsedTime() {
        assertFalse(PrivacyGuard.shouldLock(-1,100000));
        assertFalse(PrivacyGuard.shouldLock(1000,60999));
        assertTrue(PrivacyGuard.shouldLock(1000,61000));
        assertTrue(PrivacyGuard.shouldLock(1000,999999));
    }
}
